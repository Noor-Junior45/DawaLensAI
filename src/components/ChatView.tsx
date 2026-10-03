import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, Send, Bot, User, Loader2, Plus, 
  MessageSquare, Calendar, Clock, 
  History, Search, Trash2, ShieldCheck, Stethoscope,
  AlertCircle, Pill, Info, Mail, ArrowLeft, Check, CheckCheck,
  Camera, Mic, Languages, Flag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, serverTimestamp, doc, updateDoc, deleteDoc,
  getDocs, getDoc, setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Medicine, ChatMessage, ChatSession, AIProvider } from '../types';
import { chatWithAI, isProviderKeyMissing, getChatCountToday } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { DoctorLogo } from './DoctorLogo';
import { sendEmailAlert, getConsultationReportEmailHTML } from '../services/emailService';
import { trackEvent } from '../utils/analytics';
import { getApiUrl, getDirectRenderUrl } from '../utils/apiConfig';

interface ChatViewProps {
  onClose: () => void;
  medicines: Medicine[];
  user: any;
  userPhoto?: string | null;
}

const SUGGESTED_PROMPTS = [
  { icon: <span className="text-[14px]">🔍</span>, label: "Check drug interactions 🔍", prompt: "Can you analyze my active medicines to see if there are any dangerous drug-to-drug interactions I should be aware of?" },
  { icon: <span className="text-[14px]">⚠️</span>, label: "Explain side effects ⚠️", prompt: "What are the key side effects of the medicines currently in my inventory, and what warnings should I note?" },
  { icon: <span className="text-[14px]">📅</span>, label: "Daily schedule help 📅", prompt: "Help me organize a safe daily consumption schedule for all the medications in my list." },
  { icon: <span className="text-[14px]">⏳</span>, label: "Show expiring medicines ⏳", prompt: "Identify which of my medicines are expiring soon and advise on safe disposal practices." }
];

const MAIN_SESSION_ID = 'global_medical_consultation';

export const ChatView: React.FC<ChatViewProps> = ({ onClose, medicines, user, userPhoto }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMedicalDisclaimerBanner, setShowMedicalDisclaimerBanner] = useState<boolean>(true);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerTimeLeft, setDisclaimerTimeLeft] = useState(30);
  const [activeProvider] = useState<AIProvider>('gemini');
  const [isOnline, setIsOnline] = useState(true);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(true);
  const [activeAiName, setActiveAiName] = useState<'Jack' | 'Ross'>('Ross');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [keyStatus, setKeyStatus] = useState<{ hasKey: boolean; checkedAt?: string; error?: string } | null>(null);

  const [chatCount, setChatCount] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Safety & Guardrails: Reporting AI Response State (Stored anonymously without PII)
  const [reportingMessage, setReportingMessage] = useState<ChatMessage | null>(null);
  const [reportCategory, setReportCategory] = useState<string>('Inaccurate medical information');
  const [reportComment, setReportComment] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingMessage) return;
    setIsSubmittingReport(true);
    try {
      const snippet = reportingMessage.content.slice(0, 500);
      const reportPayload = {
        category: reportCategory,
        comment: reportComment,
        responseSnippet: snippet,
        provider: reportingMessage.provider || 'gemini'
      };

      try {
        await fetch(getApiUrl('/api/ai/report'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportPayload)
        });
      } catch (err) {
        console.warn('API report call error, falling back to direct Firestore:', err);
      }

      try {
        const reportId = crypto.randomUUID();
        await setDoc(doc(db, 'aiReports', reportId), {
          id: reportId,
          ...reportPayload,
          timestamp: Date.now()
        });
      } catch (fsErr) {
        console.warn('Firestore report write error:', fsErr);
      }

      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setReportingMessage(null);
        setReportComment('');
      }, 2000);
    } catch (err) {
      console.error('Failed to submit report:', err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  useEffect(() => {
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMsg) {
      setActiveAiName(lastAssistantMsg.provider === 'gemini' ? 'Jack' : 'Ross');
    } else {
      setActiveAiName('Ross');
    }
  }, [messages]);

  useEffect(() => {
    const checkKeyStatus = async () => {
      try {
        let res: Response | null = null;
        try {
          res = await fetch(getApiUrl('/api/ai/key-status'));
        } catch (fetchErr) {
          console.warn("Primary key-status endpoint check failed, attempting direct backend URL:", fetchErr);
        }

        if (!res || !res.ok) {
          try {
            const directRes = await fetch(getDirectRenderUrl('/api/ai/key-status'));
            if (directRes.ok) {
              res = directRes;
            }
          } catch (directErr) {
            console.warn("Direct key-status check failed:", directErr);
          }
        }

        if (res && res.ok) {
          const data = await res.json();
          setKeyStatus(data);
          const keyFound = data.hasKey === true;
          setHasGeminiKey(keyFound);
          setIsOnline(keyFound);
        } else {
          // If server is warming up or unreachable, verify client key
          const clientKeyPresent = !isProviderKeyMissing('gemini');
          setKeyStatus({ 
            hasKey: clientKeyPresent, 
            checkedAt: new Date().toLocaleTimeString() 
          });
          setHasGeminiKey(clientKeyPresent);
          setIsOnline(clientKeyPresent);
        }
      } catch (err) {
        console.warn("Key status verification skipped:", err);
        const clientKeyPresent = !isProviderKeyMissing('gemini');
        setKeyStatus({ 
          hasKey: clientKeyPresent, 
          checkedAt: new Date().toLocaleTimeString() 
        });
        setHasGeminiKey(clientKeyPresent);
        setIsOnline(clientKeyPresent);
      }
    };
    checkKeyStatus();
  }, []);

  useEffect(() => {
    if (keyStatus && !keyStatus.hasKey) {
      setHasGeminiKey(false);
      setIsOnline(false);
    } else if (keyStatus && keyStatus.hasKey) {
      setHasGeminiKey(true);
      setIsOnline(true);
    }
  }, [keyStatus]);

  // Load daily chat count
  useEffect(() => {
    if (!user) return;
    const loadChatCount = async () => {
      try {
        const count = await getChatCountToday(user.uid);
        setChatCount(count);
      } catch (err) {
        console.error("Failed to load chat count:", err);
      }
    };
    loadChatCount();
  }, [user]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Removed auto-disclaimer popup for clean layout as requested

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch Messages for the single global session
  useEffect(() => {
    if (!user) return;
    
    const ensureSession = async () => {
      const sessionRef = doc(db, 'users', user.uid, 'chats', MAIN_SESSION_ID);
      const snap = await getDoc(sessionRef);
      if (!snap.exists()) {
        await setDoc(sessionRef, {
          id: MAIN_SESSION_ID,
          userId: user.uid,
          title: 'Direct AI Consultation',
          createdAt: Date.now(),
          lastMessageAt: Date.now()
        });
      }
    };
    ensureSession();

    const q = query(
      collection(db, 'users', user.uid, 'chats', MAIN_SESSION_ID, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      const uniqueMsgs = Array.from(new Map(msgData.map(m => [m.id, m])).values());
      setMessages(uniqueMsgs);
    });
    return unsubscribe;
  }, [user]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isLoading || !user) return;

    const messageId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: messageId,
      role: 'user',
      content: textToSend,
      timestamp: Date.now()
    };

    // Save user message
    await setDoc(doc(db, 'users', user.uid, 'chats', MAIN_SESSION_ID, 'messages', messageId), userMsg);
    
    // Update session timestamp
    const sessionRef = doc(db, 'users', user.uid, 'chats', MAIN_SESSION_ID);
    await updateDoc(sessionRef, { lastMessageAt: Date.now() });

    setInput('');
    setIsLoading(true);
    setShowMedicalDisclaimerBanner(false); // Hide medical disclaimer after one chat to maximize screen space

    try {
      // Build history
      const historyContext: ChatMessage[] = messages.concat(userMsg).map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }));

      const aiResult = await chatWithAI(historyContext, activeProvider, user.uid, medicines);
      const aiResponse = typeof aiResult === 'string' ? aiResult : aiResult.content;
      const responseProvider: AIProvider = typeof aiResult === 'object' && aiResult.provider ? aiResult.provider : activeProvider;

      setActiveAiName(responseProvider === 'gemini' ? 'Jack' : 'Ross');
      if (responseProvider === 'gemini') {
        setHasGeminiKey(true);
      }
      trackEvent('chat_with_ai', { length: textToSend.length, provider: responseProvider });

      const aiMsgId = crypto.randomUUID();
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
        provider: responseProvider
      };

      await setDoc(doc(db, 'users', user.uid, 'chats', MAIN_SESSION_ID, 'messages', aiMsgId), aiMsg);
      await updateDoc(sessionRef, { lastMessageAt: Date.now() });
    } catch (error: any) {
      console.error("Chat Error:", error);
      setActiveAiName('Ross');
      
      const errorMessage = error.message || String(error);
      const errLower = errorMessage.toLowerCase();
      if (errLower.includes('key') || errLower.includes('api_key') || errLower.includes('unauthorized') || errLower.includes('401') || errLower.includes('403')) {
        setHasGeminiKey(false);
      }
      const isSpendCapExceeded = 
        errLower.includes("spending cap") || 
        errLower.includes("resource_exhausted") || 
        errLower.includes("monthly spending cap") ||
        errLower.includes("quota") ||
        errLower.includes("billing");

      // Auto-recover using On-Device Small Language Model (SLM)
      const { generateOfflineSlmConsultation, loadUserSlmKnowledge } = await import('../services/slmPharmacistModel');
      const userKnowledge = await loadUserSlmKnowledge(user.uid);
      const content = generateOfflineSlmConsultation(textToSend, medicines, messages, userKnowledge);

      const aiMsgId = crypto.randomUUID();
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: 'assistant',
        content,
        timestamp: Date.now(),
        provider: 'slm'
      };
      await setDoc(doc(db, 'users', user.uid, 'chats', MAIN_SESSION_ID, 'messages', aiMsgId), aiMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmailReport = async () => {
    if (!user || messages.length === 0) return;
    
    setIsLoading(true);
    try {
      const reportContent = messages.map(m => `${m.role === 'user' ? 'Patient' : 'DawaLens AI'}: ${m.content}`).join('\n\n');
      const medList = medicines.map(m => `- ${m.name} (${m.dosage || 'N/A'})`).join('\n');
      
      const subject = `Consultation Report: DawaLens AI - ${new Date().toLocaleDateString()}`;
      const text = `Here is your medical consultation summary from DawaLens AI.\n\nYour Current Medications:\n${medList}\n\nChat History:\n${reportContent}\n\nDisclaimer: This report is for informational purposes only.`;
      
      const chatHtmlBubbles = messages.map(m => {
        const sender = m.role === 'user' ? 'Patient' : 'DawaLens AI';
        const color = m.role === 'user' ? '#1e40af' : '#047857';
        const bg = m.role === 'user' ? '#eff6ff' : '#ecfdf5';
        return `
          <div style="margin-bottom: 16px; padding: 12px 16px; background-color: ${bg}; border-radius: 8px; border-left: 4px solid ${color};">
            <strong style="color: ${color}; font-size: 12px; text-transform: uppercase; font-family: sans-serif;">${sender}</strong>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #1f2937; font-family: sans-serif; line-height: 1.5;">${m.content.replace(/\n/g, '<br/>')}</p>
          </div>
        `;
      }).join('');

      const html = getConsultationReportEmailHTML(
        medicines.map(m => ({ name: m.name, dosage: m.dosage })),
        chatHtmlBubbles,
        new Date().toLocaleDateString()
      );
      
      await sendEmailAlert({
        to: user.email,
        subject,
        text,
        html
      });
      trackEvent('send_email_report', { message_count: messages.length });
      alert(`Consultation report email sent successfully to ${user.email}!`);
    } catch (err: any) {
      console.error("Mail Error:", err);
      alert(`Mail service failed: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (!user) return;
    setShowDeleteConfirm(true);
  };

  const confirmClearChat = async () => {
    if (!user) return;
    try {
      const msgsRef = collection(db, 'users', user.uid, 'chats', MAIN_SESSION_ID, 'messages');
      const snap = await getDocs(msgsRef);
      const batch = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(batch);
      setMessages([]);
      setShowMedicalDisclaimerBanner(true);
    } catch (err) {
      console.error("Error clearing chat messages:", err);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const formatMessageDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const lastAssistantMessage = useMemo(() => {
    const assistants = messages.filter(m => m.role === 'assistant');
    return assistants[assistants.length - 1];
  }, [messages]);

  const handleSpeakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_`~]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatMessageDateString = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  };

  const cleanMessageDisplay = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\s*—\s*Dr\.?\s*(?:Ross|Rose|DawaLens),?\s*Your\s*On-Device\s*SLM\s*Pharmacist\s*[🧠🌿🩺💊]*/gi, '')
      .replace(/\s*—\s*Dr\.?\s*(?:Ross|Rose|DawaLens)[^\n`]*/gi, '')
      .replace(/\s*Dr\.?\s*(?:Ross|Rose|DawaLens),?\s*your\s*on-device\s*slm\s*pharmacist[^\n`]*/gi, '')
      .trim();
  };

  const [showSuggestions, setShowSuggestions] = useState(true);

  return (
    <>
      {/* Dimmed backdrop to focus on the chat pop up and allow click-outside to close */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/35 backdrop-blur-[2px] z-[99] cursor-default transition-all" 
      />

      <motion.div 
        initial={isMobile ? { y: '100%' } : { opacity: 0, y: 40, scale: 0.98 }}
        animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
        exit={isMobile ? { y: '100%' } : { opacity: 0, y: 40, scale: 0.98 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="fixed z-[100] flex flex-col overflow-hidden font-sans bg-[#fdfbf7] border border-slate-200/80 shadow-[0_24px_64px_rgba(0,0,0,0.18)]
          top-[14vh] bottom-0 left-0 right-0 rounded-t-[32px] 
          md:top-auto md:bottom-6 md:right-6 md:left-auto md:w-[460px] md:h-[680px] md:max-h-[82vh] md:rounded-[30px]"
      >
        {/* Drag handle for mobile to represent bottom sheet */}
        <div className="md:hidden flex justify-center py-2 shrink-0 bg-[#0f9d58]">
          <div className="w-12 h-1.5 rounded-full bg-white/30" />
        </div>

        {/* Main Bar / Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-[#0f9d58] shrink-0 text-white relative z-30 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Keep only that person[svg] */}
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-3xs">
              <DoctorLogo className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-base tracking-tight leading-tight">AI Pharmacist</span>
              <div 
                className="flex items-center gap-1.5 mt-0.5"
                title={hasGeminiKey ? "Gemini API Key: Present" : "Gemini API Key: Missing"}
              >
                <span 
                  className={`inline-block w-2 h-2 rounded-full transition-all duration-300 ${
                    hasGeminiKey 
                      ? 'bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.8)]' 
                      : 'bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                  }`} 
                />
                <span className="text-[11px] text-[#e0e1f9] font-black uppercase tracking-wider leading-none">
                  {activeAiName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!showMedicalDisclaimerBanner && (
              <button
                onClick={() => setShowMedicalDisclaimerBanner(true)}
                className="flex items-center gap-1 text-[11px] text-white/90 hover:text-white bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full transition-all font-semibold shadow-3xs cursor-pointer active:scale-95"
                title="Show Medical Disclaimer"
              >
                <AlertCircle size={12} className="text-amber-300" />
                <span>Disclaimer</span>
              </button>
            )}
            {/* Red delete button with NO circular background */}
            <button
              onClick={handleClearChat}
              className="flex items-center justify-center text-red-500 hover:text-red-400 active:scale-95 transition-all p-2 bg-transparent border-none cursor-pointer"
              title="Clear Entire Chat"
            >
              <Trash2 size={18} className="stroke-[2.5]" />
            </button>
            {/* Cross [x] button with NO background - only show [x] */}
            <button 
              onClick={onClose}
              className="flex items-center justify-center text-white/90 hover:text-white active:scale-90 transition-all p-1.5 bg-transparent hover:bg-transparent border-0 shadow-none outline-none cursor-pointer"
              title="Close"
            >
              <X size={22} className="stroke-[2.5]" />
            </button>
          </div>
        </header>

        {/* Medical Disclaimer Banner: Appears every time chat is opened to keep in mind, auto-hides after one chat */}
        <AnimatePresence>
          {showMedicalDisclaimerBanner && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-amber-50/95 border-b border-amber-200/90 px-3.5 py-2 flex items-start justify-between gap-2 shrink-0 z-20 shadow-2xs overflow-hidden"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-950 leading-snug">
                  <strong className="font-bold">Medical Disclaimer:</strong> DawaLens AI is an informational medication assistant, not a doctor or diagnostic tool. Information does not constitute medical advice or prescriptions. Always consult a licensed healthcare professional.
                </p>
              </div>
              <button
                onClick={() => setShowMedicalDisclaimerBanner(false)}
                className="text-amber-800 hover:text-amber-950 p-1 rounded-md transition-colors shrink-0 cursor-pointer"
                title="Hide disclaimer"
                aria-label="Hide disclaimer"
              >
                <X size={14} className="stroke-[2.5]" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Messages area with simple soft cream white background */}
        <main 
          className="flex-1 flex flex-col relative overflow-hidden bg-[#faf8f5]"
        >
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5 scrollbar-hide relative z-10 w-full max-w-4xl mx-auto custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[#0f9d58]/10 flex items-center justify-center text-[#0f9d58] mb-3 border border-[#0f9d58]/20 mx-auto">
                  <DoctorLogo className="w-12 h-12 text-[#0f9d58]" />
                </div>
                <p className="text-sm font-bold text-slate-700">How can I help you today?</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[260px] mx-auto mb-6">Ask me anything about interactions, dosages, or side effects of your medicines.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto w-full px-4">
                  {SUGGESTED_PROMPTS.map((item, idx) => (
                    <button
                      key={`prompt-sug-${idx}`}
                      onClick={() => handleSendMessage(item.prompt)}
                      className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-[#0f9d58]/40 hover:bg-[#0f9d58]/5 text-left text-[12.5px] text-slate-700 font-medium transition-all active:scale-95 shadow-2xs hover:shadow-xs cursor-pointer"
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="line-clamp-2">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-5">
              {messages.map((msg, idx) => {
                const currentDateStr = formatMessageDate(msg.timestamp);
                const prevDateStr = idx > 0 ? formatMessageDate(messages[idx - 1].timestamp) : null;
                const showDate = idx === 0 || currentDateStr !== prevDateStr;
                const exactDateStr = formatMessageDateString(msg.timestamp);
                const isTodayStr = currentDateStr === 'Today';

                return (
                  <React.Fragment key={`chat-msg-${msg.id || ''}-${idx}`}>
                    {showDate && (
                      <div className="flex flex-col items-center gap-1.5 my-5 select-none">
                        <span className="bg-[#0f9d58]/10 text-[#065f46] text-[10px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-2xs border border-[#0f9d58]/10">
                          {exactDateStr}
                        </span>
                        {isTodayStr && (
                          <span className="bg-[#0f9d58]/15 text-[#065f46] text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-3xs">
                            TODAY
                          </span>
                        )}
                      </div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Rounded Avatar next to bubbles */}
                      {msg.role === 'user' ? (
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-800 shrink-0 shadow-3xs border border-slate-300">
                          {userPhoto ? (
                            <img src={userPhoto} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User size={16} className="stroke-[2.5]" />
                          )}
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#0f9d58]/10 flex items-center justify-center text-[#0f9d58] shrink-0 border border-[#0f9d58]/20 shadow-3xs">
                          <DoctorLogo className="w-6 h-6 text-[#0f9d58]" />
                        </div>
                      )}

                      {/* Flex column for Chat Bubble and action buttons below */}
                      <div className="flex flex-col max-w-[80%] md:max-w-[72%]">
                        {/* Chat Bubble */}
                        <div className={`relative px-4 py-3 shadow-3xs flex flex-col ${
                          msg.role === 'user' 
                            ? 'bg-[#e2f7cb] text-[#1f1f1f] rounded-[18px] rounded-tr-none' 
                            : 'bg-white text-[#1f1f1f] rounded-[18px] rounded-tl-none border border-slate-100'
                        }`}>
                          <div className="prose prose-sm max-w-none text-[14.5px] leading-relaxed break-words text-[#1f1f1f] [&_a]:text-[#0f9d58] [&_a]:underline [&_a]:font-bold hover:[&_a]:text-[#0d854a]">
                            <ReactMarkdown
                              components={{
                                a: ({ node, ...props }) => (
                                  <a 
                                    {...props} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                  />
                                )
                              }}
                            >
                              {cleanMessageDisplay(msg.content)}
                            </ReactMarkdown>
                          </div>
                          
                          {/* Timestamp & Tick */}
                          <div className="flex items-center self-end gap-1 mt-1.5">
                            <span className="text-[9.5px] text-slate-400 font-medium select-none">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.role === 'user' && (
                              <CheckCheck size={13} className="text-emerald-500" />
                            )}
                          </div>

                          {/* Aesthetic Tails */}
                          {msg.role === 'user' && (
                            <svg className="absolute top-0 -right-[8px]" width="9" height="13" viewBox="0 0 10 15">
                              <path d="M0 0 L 10 0 C 7 3 3 8 0 15 Z" fill="#e2f7cb" />
                            </svg>
                          )}
                          
                          {msg.role === 'assistant' && (
                            <svg className="absolute top-0 -left-[8px]" width="9" height="13" viewBox="0 0 10 15">
                              <path d="M10 0 L 0 0 C 3 3 7 8 10 15 Z" fill="#ffffff" />
                            </svg>
                          )}
                        </div>

                        {/* Speaker, copy, and report button OUTSIDE of the reply box */}
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-3 mt-1.5 px-2">
                            <button 
                              onClick={() => handleSpeakText(msg.content)} 
                              className="text-[10px] text-[#0f9d58] font-black hover:text-[#065f46] transition-colors flex items-center gap-1 select-none cursor-pointer"
                            >
                              <span>🔊 Speak</span>
                            </button>
                            <button 
                              onClick={() => handleCopyText(msg.content)} 
                              className="text-[10px] text-slate-400 font-black hover:text-slate-600 transition-colors flex items-center gap-1 select-none cursor-pointer"
                            >
                              <span>📋 Copy</span>
                            </button>
                            <button 
                              onClick={() => {
                                setReportingMessage(msg);
                                setReportSuccess(false);
                              }} 
                              className="text-[10px] text-amber-700 font-black hover:text-amber-900 transition-colors flex items-center gap-1 select-none cursor-pointer"
                              title="Report this AI response"
                            >
                              <Flag size={11} className="stroke-[2.5]" />
                              <span>Report</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </React.Fragment>
                );
              })}

              {isLoading && (
                <div className="flex justify-start items-start gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#0f9d58]/10 flex items-center justify-center text-[#0f9d58] shrink-0 border border-[#0f9d58]/20 shadow-3xs">
                    <DoctorLogo className="w-6 h-6 text-[#0f9d58]" />
                  </div>
                  <div className="bg-white px-4 py-3 rounded-[18px] rounded-tl-none shadow-3xs border border-slate-100">
                    <div className="flex gap-1.5 py-1">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-2 h-2 bg-[#0f9d58] rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-2 h-2 bg-[#0f9d58] rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-2 h-2 bg-[#0f9d58] rounded-full" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Bar Section */}
          <div className="bg-[#f0f2f5] border-t border-slate-200/80 shrink-0 safe-bottom z-20 py-2.5 pb-4">
            <div className="w-full">
              {/* Input Row */}
              <div className="px-4 flex items-center gap-3">
                {/* Main Input Pill */}
                <div className="flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="w-full bg-white border border-slate-200 rounded-full py-3.5 px-5 text-[14px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0f9d58]/30 placeholder:text-slate-400 shadow-inner"
                  />
                </div>

                {/* Send Button styled like WhatsApp (always green, white send icon) */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading}
                  className="p-3.5 rounded-full bg-[#00a884] hover:bg-[#008f72] text-white transition-all shadow-md active:scale-90 flex items-center justify-center shrink-0 cursor-pointer"
                  title="Send Message"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="stroke-[2.5]" />}
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Custom Confirmation Modal */}
        <AnimatePresence>
          {/* Safety & Compliance: Report AI Response Modal */}
          {reportingMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 rounded-[30px]"
            >
              <motion.div
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                      <Flag size={18} className="stroke-[2.5]" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">Report AI Response</h3>
                  </div>
                  <button 
                    onClick={() => setReportingMessage(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X size={18} />
                  </button>
                </div>

                {reportSuccess ? (
                  <div className="py-6 text-center space-y-2">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Check size={24} className="stroke-[3]" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">Report Submitted</p>
                    <p className="text-xs text-slate-500">Thank you. Your feedback is recorded anonymously without any personal data to improve clinical AI safety.</p>
                  </div>
                ) : (
                  <form onSubmit={handleReportSubmit} className="space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Help us maintain safety and accuracy. Reports are stored anonymously with zero personal or patient identifiers.
                    </p>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Issue Type
                      </label>
                      <select
                        value={reportCategory}
                        onChange={(e) => setReportCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#0f9d58]"
                      >
                        <option value="Inaccurate medical information">Inaccurate medical information</option>
                        <option value="Potentially dangerous advice">Potentially dangerous advice</option>
                        <option value="Hallucination / Irrelevant answer">Hallucination / Irrelevant answer</option>
                        <option value="Inappropriate tone / wording">Inappropriate tone / wording</option>
                        <option value="Other concern">Other concern</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Optional Details
                      </label>
                      <textarea
                        rows={3}
                        value={reportComment}
                        onChange={(e) => setReportComment(e.target.value)}
                        placeholder="Explain what was inaccurate or concerning (do not include your personal health info)..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0f9d58] resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setReportingMessage(null)}
                        className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-xs transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingReport}
                        className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-full font-bold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isSubmittingReport ? <Loader2 size={14} className="animate-spin" /> : 'Submit Report'}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}

          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 rounded-[30px]"
            >
              <motion.div
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-slate-100 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-100">
                  <Trash2 size={22} className="stroke-[2.5]" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">Clear Chat History?</h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Are you sure you want to permanently clear your conversation with Dr. DawaLens? This action cannot be undone.
                </p>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmClearChat}
                    className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-xs transition-colors cursor-pointer shadow-md"
                  >
                    Clear Chat
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};
