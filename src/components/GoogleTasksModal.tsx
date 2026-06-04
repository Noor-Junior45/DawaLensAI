import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CheckCircle2, ListTodo, Loader2, Plus, RefreshCw, 
  Sparkles, Check, ExternalLink, Calendar, Info, Trash2
} from 'lucide-react';
import { Medicine } from '../types';
import { auth, signInWithPopup } from '../firebase';
import { GoogleAuthProvider } from 'firebase/auth';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface GoogleTasksModalProps {
  onClose: () => void;
  medicines: Medicine[];
  accentColor: string;
}

interface TaskList {
  id: string;
  title: string;
}

interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status?: string;
}

export function GoogleTasksModal({ onClose, medicines, accentColor }: GoogleTasksModalProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [existingTasks, setExistingTasks] = useState<GoogleTask[]>([]);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null); // 'all' or medicineId or null
  const [newListName, setNewListName] = useState('Medicine Reminders');
  const [showCreateList, setShowCreateList] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);

  // Load access token and user info from sessionStorage on load
  useEffect(() => {
    const savedToken = sessionStorage.getItem('gt_access_token');
    const savedUser = sessionStorage.getItem('gt_user');
    if (savedToken && savedUser) {
      setAccessToken(savedToken);
      setGoogleUser(JSON.parse(savedUser));
      setIsConnected(true);
    }
  }, []);

  // When token changes, load task lists automatically
  useEffect(() => {
    if (accessToken) {
      fetchTaskLists();
    }
  }, [accessToken]);

  // When selected list changes, load existing tasks
  useEffect(() => {
    if (accessToken && selectedListId) {
      fetchTasks(selectedListId);
    } else {
      setExistingTasks([]);
    }
  }, [accessToken, selectedListId]);

  const logInfo = (msg: string) => {
    setSyncLogs(prev => [`[Info] ${msg}`, ...prev].slice(0, 30));
  };

  const logError = (msg: string) => {
    setSyncLogs(prev => [`[Error] ${msg}`, ...prev].slice(0, 30));
  };

  const logSuccess = (msg: string) => {
    setSyncLogs(prev => [`[Success] ${msg}`, ...prev].slice(0, 30));
  };

  const connectGoogleTasks = async () => {
    triggerLightHaptic();
    logInfo('Connecting with Google Tasks permissions...');
    try {
      const provider = new GoogleAuthProvider();
      // Ask specifically for Tasks scopes to interact with Task Lists and Tasks
      provider.addScope('https://www.googleapis.com/auth/tasks');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        setAccessToken(token);
        setGoogleUser(result.user);
        setIsConnected(true);
        sessionStorage.setItem('gt_access_token', token);
        sessionStorage.setItem('gt_user', JSON.stringify(result.user));
        logSuccess(`Connected successfully to ${result.user.email}`);
        triggerSuccessHaptic();
      } else {
        logError('Authentication credentials were not returned.');
      }
    } catch (err: any) {
      console.error(err);
      logError(err?.message || 'Google account pairing rejected or failed.');
    }
  };

  const disconnectGoogleTasks = () => {
    triggerLightHaptic();
    setAccessToken(null);
    setGoogleUser(null);
    setIsConnected(false);
    setTaskLists([]);
    setSelectedListId('');
    setExistingTasks([]);
    sessionStorage.removeItem('gt_access_token');
    sessionStorage.removeItem('gt_user');
    logInfo('Disconnected your Google Tasks integration.');
  };

  const fetchTaskLists = async () => {
    if (!accessToken) return;
    setIsLoadingLists(true);
    logInfo('Fetching user task lists...');
    try {
      const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const data = await res.json();
      const lists: TaskList[] = data.items || [];
      setTaskLists(lists);

      // Auto-choose a list if "Medicine Reminders" exists
      const medicineList = lists.find(l => l.title.toLowerCase() === 'medicine reminders');
      if (medicineList) {
        setSelectedListId(medicineList.id);
        logSuccess(`Found and selected existing 'Medicine Reminders' list!`);
      } else if (lists.length > 0) {
        setSelectedListId(lists[0].id);
        logInfo(`Selected default list: ${lists[0].title}`);
      }
    } catch (err: any) {
      console.error(err);
      logError(`Failed to fetch task lists: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsLoadingLists(false);
    }
  };

  const fetchTasks = async (listId: string) => {
    if (!accessToken) return;
    setIsLoadingTasks(true);
    try {
      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?maxResults=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const data = await res.json();
      setExistingTasks(data.items || []);
    } catch (err: any) {
      console.error(err);
      logError(`Could not fetch tasks for selected list.`);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const createTaskList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newListName.trim()) return;
    setIsCreatingList(true);
    logInfo(`Creating new task list: "${newListName}"...`);
    try {
      const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newListName.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const newList = await res.json();
      
      setTaskLists(prev => [newList, ...prev]);
      setSelectedListId(newList.id);
      setShowCreateList(false);
      logSuccess(`Created and synchronized "${newListName}" task list!`);
      triggerSuccessHaptic();
    } catch (err: any) {
      console.error(err);
      logError(`Failed to create task list: ${err.message}`);
    } finally {
      setIsCreatingList(false);
    }
  };

  const syncMedicineTask = async (med: Medicine) => {
    if (!accessToken || !selectedListId) return;
    setIsSyncing(med.id);
    logInfo(`Syncing task for medication: ${med.name}...`);

    try {
      // Build Google Tasks structure
      const title = `💊 Take Medication: ${med.name} (${med.dosage || 'Assorted'})`;
      
      // Let's create an elegant, robust template for Google Tasks notes
      const notes = [
        med.dosage ? `Dosage: ${med.dosage}` : null,
        med.schedule ? `Schedule: ${med.schedule}` : 'Schedule: As Needed / Alert driven',
        med.usageInstructions ? `Usage Instructions: ${med.usageInstructions}` : null,
        med.expirationDate ? `Expiration Date: ${med.expirationDate}` : null,
        `Last Synced: ${new Date().toLocaleString()}`,
        '---',
        'Add a custom repeating rule in Google Reminders or Calendar to maintain a consistent medication log.'
      ].filter(Boolean).join('\n');

      // Create due date formatted perfectly (e.g. YYYY-MM-DDTHH:MM:SS.SSSZ)
      // Standardize to tomorrow 8:00 AM (local date context offset or standard ISO)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);
      const dueString = tomorrow.toISOString(); // Format according to RFC3339

      // Check if a task matching this title already exists in the selected lists to prevent double notifications
      const doesExist = existingTasks.some(t => t.title === title && t.status !== 'completed');
      if (doesExist) {
        const confirmResult = window.confirm(`An active "${title}" task already exists on your Google Task list. Would you like to create an additional one?`);
        if (!confirmResult) {
          logInfo(`Task skip requested by user for ${med.name}.`);
          setIsSyncing(null);
          return;
        }
      }

      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${selectedListId}/tasks`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          notes,
          due: dueString
        }),
      });

      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      const createdTask = await res.json();
      
      // Update local task state
      setExistingTasks(prev => [createdTask, ...prev]);
      logSuccess(`Synced "${med.name}" to Google Tasks!`);
      triggerSuccessHaptic();
    } catch (err: any) {
      console.error(err);
      logError(`Failed listing task for ${med.name}: ${err.message}`);
    } finally {
      setIsSyncing(null);
    }
  };

  const syncAllMedicines = async () => {
    if (!accessToken || !selectedListId || medicines.length === 0) return;
    setIsSyncing('all');
    logInfo(`Starting batch sync for all ${medicines.length} medications...`);
    let successCount = 0;

    const filteredMeds = medicines.filter(m => !m.isDeleted);

    for (const med of filteredMeds) {
      try {
        const title = `💊 Take Medication: ${med.name} (${med.dosage || 'Assorted'})`;
        // Check for active ones to prevent duplicates in bulk sync
        const alreadyExists = existingTasks.some(t => t.title === title && t.status !== 'completed');
        if (alreadyExists) continue;

        const notes = [
          med.dosage ? `Dosage: ${med.dosage}` : null,
          med.schedule ? `Schedule: ${med.schedule}` : 'Schedule: As Needed',
          med.usageInstructions ? `Usage Instructions: ${med.usageInstructions}` : null,
          med.expirationDate ? `Expiration Date: ${med.expirationDate}` : null,
          `Bulk Synced: ${new Date().toLocaleString()}`,
        ].filter(Boolean).join('\n');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);

        await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${selectedListId}/tasks`, {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            notes,
            due: tomorrow.toISOString()
          }),
        });
        successCount++;
      } catch (err) {
        console.error(`Dynamic bulk failure on med ${med.name}:`, err);
      }
    }

    // Refresh tasks view
    await fetchTasks(selectedListId);
    logSuccess(`Batch migration completed. Successfully set up ${successCount} new Google Task alarms!`);
    setIsSyncing(null);
    triggerSuccessHaptic();
  };

  const activeMeds = medicines.filter(m => !m.isDeleted);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md"
    >
      <div className="w-full max-w-lg bg-[#141414] border border-white/10 rounded-[40px] p-6 max-h-[85vh] flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <ListTodo size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Google Tasks</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Medication Alert Sync</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/5 border border-white/10 rounded-2xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar">
          
          {/* Connection Area */}
          {!isConnected ? (
            <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/10 rounded-3xl p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
                <Sparkles size={24} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-white">Connect Google Tasks Integration</h3>
                <p className="text-xs text-white/50 leading-relaxed max-w-sm mx-auto">
                  Automatically sync your medicine schedules, dosages, and daily reminder alarms to Google Tasks. Tasks synchronize directly with Google Calendar and Gmail widgets completely free!
                </p>
              </div>
              <button
                onClick={connectGoogleTasks}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-medium text-xs rounded-2xl transition-all shadow-lg shadow-indigo-500/15"
              >
                Connect Google Tasks Account
              </button>
            </div>
          ) : (
            <>
              {/* Linked Account Card */}
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img 
                    src={googleUser?.photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                    alt="avatar" 
                    className="w-9 h-9 rounded-full border border-white/10" 
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white">{googleUser?.displayName || 'Google User'}</p>
                    <p className="text-[10px] text-white/40 font-mono">{googleUser?.email}</p>
                  </div>
                </div>
                <button
                  onClick={disconnectGoogleTasks}
                  className="px-3 py-1.5 border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 text-[10px] text-red-400 font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  Disconnect
                </button>
              </div>

              {/* Task List Selector */}
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-white/45 font-black uppercase tracking-wider">Sync Destination List</label>
                  <button 
                    onClick={() => setShowCreateList(!showCreateList)}
                    className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> {showCreateList ? 'Cancel' : 'Create New List'}
                  </button>
                </div>

                {showCreateList ? (
                  <form onSubmit={createTaskList} className="flex gap-2">
                    <input 
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="e.g., Medicine Alarms"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-white"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isCreatingList}
                      className="px-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-medium text-xs flex items-center justify-center transition-all"
                    >
                      {isCreatingList ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                    </button>
                  </form>
                ) : (
                  <div className="flex gap-2">
                    {isLoadingLists ? (
                      <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/5 h-10 w-full rounded-2xl text-xs text-white/40">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Fetching lists...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedListId}
                        onChange={(e) => setSelectedListId(e.target.value)}
                        className="w-full bg-[#1c1c1c] border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {taskLists.map(list => (
                          <option key={list.id} value={list.id}>{list.title}</option>
                        ))}
                        {taskLists.length === 0 && <option value="">No lists found. Please create one!</option>}
                      </select>
                    )}
                    <button 
                      onClick={fetchTaskLists}
                      title="Refresh lists"
                      className="p-2.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-white/70 transition-colors"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Medicine Alerts Sync List */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center px-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/45 font-black uppercase tracking-wider">My Medications</span>
                    <span className="text-[10px] text-white/30 font-medium">Click Sync to set Google alerts automatically</span>
                  </div>
                  {activeMeds.length > 0 && (
                    <button
                      onClick={syncAllMedicines}
                      disabled={isSyncing !== null || !selectedListId}
                      className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      {isSyncing === 'all' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles size={11} className="text-indigo-400" />
                      )}
                      Sync All
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {activeMeds.map(med => {
                    // Check if this particular med has an active unmatched task
                    const taskTitle = `💊 Take Medication: ${med.name} (${med.dosage || 'Assorted'})`;
                    const hasSyncedTask = existingTasks.some(t => t.title === taskTitle && t.status !== 'completed');

                    return (
                      <div 
                        key={med.id} 
                        className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{med.name}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            {med.dosage && (
                              <span className="text-[9px] text-indigo-300/80 font-medium">{med.dosage}</span>
                            )}
                            {med.schedule && (
                              <span className="text-[9px] text-white/40 flex items-center gap-1">
                                <Calendar size={8} /> {med.schedule}
                              </span>
                            )}
                          </div>
                        </div>

                        {hasSyncedTask ? (
                          <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                            <Check size={11} className="text-emerald-400 font-bold" />
                            <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Synced</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => syncMedicineTask(med)}
                            disabled={isSyncing !== null || !selectedListId}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-indigo-500 hover:text-white hover:border-indigo-400 rounded-xl text-[10px] font-bold text-white/70 transition-all flex items-center gap-1 shadow-sm"
                          >
                            {isSyncing === med.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-white" />
                            ) : (
                              'Sync Alert'
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {activeMeds.length === 0 && (
                    <div className="py-6 text-center text-xs text-white/30 border border-dashed border-white/5 rounded-2xl">
                      No active medications found. Add one in your logs!
                    </div>
                  )}
                </div>
              </div>

              {/* Console Sync Logs */}
              {syncLogs.length > 0 && (
                <div className="space-y-1.5 shrink-0">
                  <p className="text-[10px] text-white/45 font-black uppercase tracking-wider px-1">Sync Activity Terminal</p>
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-3 h-[90px] overflow-y-auto font-mono text-[8px] text-white/40 space-y-1">
                    {syncLogs.map((log, i) => {
                      let colorClass = 'text-white/40';
                      if (log.startsWith('[Error]')) colorClass = 'text-red-400';
                      if (log.startsWith('[Success]')) colorClass = 'text-emerald-400';
                      if (log.startsWith('[Info]')) colorClass = 'text-indigo-300';
                      return (
                        <div key={i} className={colorClass}>{log}</div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Learn More Banner */}
          <div className="bg-white/[0.01] border border-white/[0.03] rounded-2xl p-3.5 flex gap-3 text-xs text-white/45 leading-relaxed shrink-0">
            <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[10px]">
              <strong>Pro-tip:</strong> When synced, Google Tasks will automatically trigger pop-up alert reminders on your smart devices, smartwatches, and desktop workstations that support the Google suite completely natively.
            </p>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
