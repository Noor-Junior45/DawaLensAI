import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, Send, Bot, User, Sparkles, Loader2, Plus, 
  MessageSquare, ChevronLeft, Calendar, Clock, 
  History, Search, Trash2, ShieldCheck, Stethoscope,
  AlertCircle, Pill, Info, Mail, ArrowLeft, Check, CheckCheck,
  Camera, Mic, Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, serverTimestamp, doc, updateDoc, deleteDoc,
  getDocs, getDoc, setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Medicine, ChatMessage, ChatSession, AIProvider } from '../types';
import { chatWithAI, isProviderKeyMissing } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { DoctorLogo } from './DoctorLogo';

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
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerTimeLeft, setDisclaimerTimeLeft] = useState(30);
  const [activeProvider] = useState<AIProvider>('gemini');
  const [isOnline, setIsOnline] = useState(true);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    setIsOnline(!isProviderKeyMissing('gemini'));
  }, []);
  
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

    try {
      // Build history
      const historyContext: ChatMessage[] = messages.concat(userMsg).map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }));

      const medContext = `[Patient Profile & Storage Context:
      - Inventory Check: Use this list to intelligently suggest medicines the user ALREADY has in their vault.
      - User's Stored Medicines: ${medicines.map(m => `${m.name} (${m.dosage}, ${m.form})`).join(", ")}
      - Date: ${new Date().toLocaleDateString()}
      - Task: If the user asks for a remedy or recommendation, search their 'User's Stored Medicines' first. Tell them exactly what they have that might help.]\n\n`;
      
      const lastMsgWithContext: ChatMessage = { 
        role: 'user', 
        content: messages.length === 0 ? medContext + textToSend : textToSend,
        timestamp: Date.now()
      };
      
      const promptHistory = historyContext.slice(0, -1).concat(lastMsgWithContext);

      const aiResponse = await chatWithAI(promptHistory, activeProvider);
      setIsOnline(true);

      const aiMsgId = crypto.randomUUID();
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
        provider: activeProvider
      };

      await setDoc(doc(db, 'users', user.uid, 'chats', MAIN_SESSION_ID, 'messages', aiMsgId), aiMsg);
      await updateDoc(sessionRef, { lastMessageAt: Date.now() });
    } catch (error) {
      console.error("Chat Error:", error);
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmailReport = async () => {
    if (!user || messages.length === 0) return;
    
    setIsLoading(true);
    try {
      const reportContent = messages.map(m => `${m.role === 'user' ? 'Patient' : 'Doctor'}: ${m.content}`).join('\n\n');
      const medList = medicines.map(m => `- ${m.name} (${m.dosage})`).join('\n');
      
      const emailDoc = {
        to: user.email,
        message: {
          subject: `DawaLens AI Consultation Report - ${new Date().toLocaleDateString()}`,
          text: `Here is your medical consultation summary from DawaLens AI.\n\nYour Current Medications:\n${medList}\n\nChat History:\n${reportContent}\n\nDisclaimer: This report is for informational purposes only.`,
          html: `<h3>DawaLens AI Consultation Report</h3><p>Date: ${new Date().toLocaleDateString()}</p><h4>Current Medications:</h4><ul>${medicines.map(m => `<li>${m.name} (${m.dosage})</li>`).join('')}</ul><h4>Consultation Summary:</h4><pre>${reportContent}</pre><p><i>Disclaimer: This report was generated by AI and is for informational purposes only. Please consult your doctor for medical decisions.</i></p>`
        },
        timestamp: serverTimestamp()
      };
      
      await addDoc(collection(db, 'mail'), emailDoc);
      alert(`Report simulation complete. If you have the 'Trigger Email' extension enabled in your Firebase Console, an email has been sent to ${user.email}.`);
    } catch (err) {
      console.error("Mail Error:", err);
      alert("Mail service failed. Ensure the 'mail' collection exists and you have permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!user) return;
    if (window.confirm("This will permanently clear your consultation history. Continue?")) {
      const msgsRef = collection(db, 'users', user.uid, 'chats', MAIN_SESSION_ID, 'messages');
      const snap = await getDocs(msgsRef);
      const batch = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(batch);
      setMessages([]);
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
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1.5 text-white/90 hover:text-white transition-colors hover:bg-white/10 rounded-full" title="Back">
              <ChevronLeft size={24} />
            </button>
            
            <div className="flex items-center gap-3">
              {/* Keep only that person[svg] */}
              <div className="relative shrink-0 flex items-center justify-center">
                <DoctorLogo className="w-10 h-10 text-white" />
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[#0f9d58] rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
              </div>
              
              <div className="flex flex-col">
                <span className="font-extrabold text-white text-base tracking-tight leading-tight">AI Pharmacist</span>
                <span className="text-[9px] text-[#e0e1f9] font-black uppercase tracking-widest flex items-center gap-1 mt-0.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#34d399]' : 'bg-[#ef4444]'}`} />
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Red delete button with NO circular background */}
            <button
              onClick={handleClearChat}
              className="flex items-center justify-center text-red-500 hover:text-red-400 active:scale-95 transition-all p-2 bg-transparent border-none"
              title="Clear Entire Chat"
            >
              <Trash2 size={18} className="stroke-[2.5]" />
            </button>
            {/* Black cross button with circular apple-style glassmorphism background */}
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-black/10 backdrop-blur-md text-white hover:bg-black/20 active:scale-95 rounded-full transition-all border border-white/10 shadow-xs"
              title="Close"
            >
              <X size={18} className="stroke-[2.5]" />
            </button>
          </div>
        </header>

        {/* Main Messages area with simple soft cream white background */}
        <main 
          className="flex-1 flex flex-col relative overflow-hidden bg-[#faf8f5]"
        >
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5 scrollbar-hide relative z-10 w-full max-w-4xl mx-auto custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-70 py-20">
                <div className="w-16 h-16 rounded-full bg-[#0f9d58]/10 flex items-center justify-center text-[#0f9d58] mb-3 border border-[#0f9d58]/20">
                  <DoctorLogo className="w-12 h-12 text-[#0f9d58]" />
                </div>
                <p className="text-sm font-bold text-slate-700">How can I help you today?</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[260px] mx-auto">Ask me anything about interactions, dosages, or side effects of your medicines.</p>
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
                        <DoctorLogo className="w-9 h-9 text-[#0f9d58] shrink-0" />
                      )}

                      {/* Flex column for Chat Bubble and action buttons below */}
                      <div className="flex flex-col max-w-[80%] md:max-w-[72%]">
                        {/* Chat Bubble */}
                        <div className={`relative px-4 py-3 shadow-3xs flex flex-col ${
                          msg.role === 'user' 
                            ? 'bg-[#e2f7cb] text-[#1f1f1f] rounded-[18px] rounded-tr-none' 
                            : 'bg-white text-[#1f1f1f] rounded-[18px] rounded-tl-none border border-slate-100'
                        }`}>
                          <div className="prose prose-sm max-w-none text-[14.5px] leading-relaxed break-words text-[#1f1f1f]">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
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

                        {/* Speaker and copy button OUTSIDE of the reply box */}
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
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </React.Fragment>
                );
              })}

              {isLoading && (
                <div className="flex justify-start items-start gap-2.5">
                  <DoctorLogo className="w-9 h-9 text-[#0f9d58] shrink-0" />
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
          <div className="bg-[#f0f2f5] border-t border-slate-200/80 shrink-0 safe-bottom z-20 pb-4">
            <div className="w-full">
              {/* Input Row */}
              <div className="px-4 pt-3 flex items-center gap-3">
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
      </motion.div>
    </>
  );
};
