import React, { useState, useEffect } from 'react';
import { Plus, Camera, Info, Settings, Search, X, History, Trash2, ShieldAlert, CheckCircle2, Mail, Pill, Shield, LogIn, Eye, EyeOff, Lock, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { Medicine, MedicineForm as MedicineFormType } from './types';
import { MEDICINE_CATEGORIES, getCategoryStyle, isCategoryMatch, getMedicineCategory, calculateDiffDays } from './constants';
import { CameraCapture } from './components/CameraCapture';
import { MedicineList } from './components/MedicineList';
import { SettingsModal } from './components/SettingsModal';
import { ChatView } from './components/ChatView';
import { MailboxModal } from './components/MailboxModal';
import { extractMedicineData, checkDrugInteractions, InteractionResult, categorizeMedicinesWithAI } from './services/geminiService';
import { 
  auth, db, signOut, onAuthStateChanged, 
  collection, doc, setDoc, deleteDoc, updateDoc, writeBatch, onSnapshot, query, where, orderBy, getDocs, User,
  handleFirestoreError, OperationType, deleteField, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
  serverTimestamp, reauthenticateWithPopup, reauthenticateWithCredential, GoogleAuthProvider, getAuthHeader
} from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  isBrowserNotificationSupported, 
  requestBrowserNotificationPermission, 
  checkAndTriggerBrowserExpiryNotifications, 
  showBrowserNotification,
  registerBrowserPushTokenWithServer 
} from './services/browserNotificationService';

import { DoctorLogo } from './components/DoctorLogo';
import { MedicineDetailsPage } from './components/MedicineDetailsPage';
import { MedicineHistoryPage } from './components/MedicineHistoryPage';
import { MedicineEditPage } from './components/MedicineEditPage';
import { MedicineAddPage } from './components/MedicineAddPage';
import { UserGuidePage } from './components/UserGuidePage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/TermsOfServicePage';
import { AccountDeletionPage } from './components/AccountDeletionPage';

import { triggerLightHaptic, triggerSuccessHaptic } from './utils/haptics';
import { localImageStorage } from './services/localImageStorage';
import { syncExpiryScheduleWithServer } from './services/emailService';
import { trackEvent } from './utils/analytics';
import { signInWithGoogleAdaptive, signOutAdaptive } from './services/nativeAuthService';
import { setCrashReportingUser } from './services/crashReportingService';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { initNativePerformance, setNativeBackButtonHandler } from './services/nativePerformanceService';
import { initNativeNotifications, scheduleNativeMedicineAlerts } from './services/nativeNotificationService';
import { useEdgeSwipeBack, usePullToRefresh } from './utils/mobileGestures';
import { getApiUrl } from './utils/apiConfig';

type PublicPageType = 'guide' | 'privacy' | 'terms' | 'delete-account' | null;

const getInitialPublicPage = (): PublicPageType => {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const pageParam = searchParams.get('page');
    if (pageParam === 'guide' || pageParam === 'manual') return 'guide';
    if (pageParam === 'privacy') return 'privacy';
    if (pageParam === 'terms') return 'terms';
    if (pageParam === 'delete-account' || pageParam === 'account-delete' || pageParam === 'deleteaccount') return 'delete-account';

    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes('/guide') || pathname.includes('/manual')) return 'guide';
    if (pathname.includes('/privacy')) return 'privacy';
    if (pathname.includes('/terms')) return 'terms';
    if (pathname.includes('/delete-account') || pathname.includes('/account-delete') || pathname.includes('/accountdelete')) return 'delete-account';
  } catch (e) {
    console.warn('Failed to parse URL for public page:', e);
  }
  return null;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [publicPage, setPublicPage] = useState<PublicPageType>(getInitialPublicPage);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractionWarning, setExtractionWarning] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'expired' | 'expiring_soon' | 'expiring_3_months' | 'taken' | 'expiring_6_months'>('all');
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
  const [alertThreshold, setAlertThreshold] = useState(90);
  const [lowQuantityThreshold, setLowQuantityThreshold] = useState(5);
  const [accentColor, setAccentColor] = useState('#f97316');
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [isLikedOnly, setIsLikedOnly] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [passwordResetEmailSent, setPasswordResetEmailSent] = useState<string | null>(null);
  const [activeFooterModal, setActiveFooterModal] = useState<'guide' | 'privacy' | 'terms' | null>(null);
  const [openedFromSettings, setOpenedFromSettings] = useState<boolean>(false);
  const [selectedDetailsMedicine, setSelectedDetailsMedicine] = useState<Medicine | null>(null);
  const [activeSystemPage, setActiveSystemPage] = useState<'details' | 'history' | 'edit' | 'add' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMedicineIds, setSelectedMedicineIds] = useState<Set<string>>(new Set());
  const categoryDropdownRef = React.useRef<HTMLDivElement>(null);

  // Mandatory First-Launch Medical & Safety Disclaimer Acknowledgment State
  const [hasAcceptedMedicalDisclaimer, setHasAcceptedMedicalDisclaimer] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dawalens_medical_disclaimer_acknowledged') === 'true';
    } catch {
      return false;
    }
  });
  const [disclaimerCheckConsent, setDisclaimerCheckConsent] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const navigateToPublicPage = (page: PublicPageType) => {
    setPublicPage(page);
    try {
      if (page) {
        window.history.pushState(null, '', `/?page=${page}`);
      } else {
        window.history.pushState(null, '', '/');
      }
    } catch (e) {
      console.warn('History pushState error:', e);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setPublicPage(getInitialPublicPage());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const currentDetailsMedicine = selectedDetailsMedicine
    ? medicines.find(m => m.id === selectedDetailsMedicine.id) || selectedDetailsMedicine
    : null;

  // Google Site Verification Dynamic Header Injection
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('google_site_verification_token');
      if (savedToken && savedToken.trim()) {
        const existing = document.querySelector('meta[name="google-site-verification"]');
        if (existing) existing.remove();
        
        const meta = document.createElement('meta');
        meta.name = 'google-site-verification';
        meta.content = savedToken.trim();
        document.head.appendChild(meta);
      }
    } catch (e) {
      console.warn('Failed to load Google Site Verification meta tag:', e);
    }
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authStep, setAuthStep] = useState<'email' | 'password'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isEmailLoginOpen, setIsEmailLoginOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [interactionResult, setInteractionResult] = useState<InteractionResult | null>(null);
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      setCrashReportingUser(currentUser ? currentUser.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Native Android Performance & Universal Back Button Handling
  const modalsStateRef = React.useRef({
    publicPage,
    alertMessage,
    passwordResetEmailSent,
    isCategoryDropdownOpen,
    activeFooterModal,
    selectedDetailsMedicine,
    activeSystemPage,
    isCameraOpen,
    isSettingsOpen,
    isEmailLoginOpen,
    isInteractionModalOpen,
    isSelectionMode,
    isChatOpen,
    isMailboxOpen,
    searchQuery,
    filter,
    isLikedOnly,
  });

  useEffect(() => {
    modalsStateRef.current = {
      publicPage,
      alertMessage,
      passwordResetEmailSent,
      isCategoryDropdownOpen,
      activeFooterModal,
      selectedDetailsMedicine,
      activeSystemPage,
      isCameraOpen,
      isSettingsOpen,
      isEmailLoginOpen,
      isInteractionModalOpen,
      isSelectionMode,
      isChatOpen,
      isMailboxOpen,
      searchQuery,
      filter,
      isLikedOnly,
    };
  }, [
    publicPage,
    alertMessage,
    passwordResetEmailSent,
    isCategoryDropdownOpen,
    activeFooterModal,
    selectedDetailsMedicine,
    activeSystemPage,
    isCameraOpen,
    isSettingsOpen,
    isEmailLoginOpen,
    isInteractionModalOpen,
    isSelectionMode,
    isChatOpen,
    isMailboxOpen,
    searchQuery,
    filter,
    isLikedOnly,
  ]);

  const handleGlobalBackNavigation = React.useCallback((): boolean => {
    const s = modalsStateRef.current;

    // 1. Notices & Alerts
    if (s.alertMessage) {
      setAlertMessage(null);
      return true;
    }
    if (s.passwordResetEmailSent) {
      setPasswordResetEmailSent(null);
      return true;
    }

    // 2. Public legal & guide pages (User Guide, Privacy, Terms, Delete Account)
    if (s.publicPage) {
      handleBackFromPublicPage();
      return true;
    }

    // 3. Dropdowns & Footer Modals
    if (s.isCategoryDropdownOpen) {
      setIsCategoryDropdownOpen(false);
      return true;
    }
    if (s.activeFooterModal) {
      setActiveFooterModal(null);
      return true;
    }

    // 4. Safety & Interaction Modal
    if (s.isInteractionModalOpen) {
      setIsInteractionModalOpen(false);
      return true;
    }

    // 5. System Pages (Edit -> Details, History -> Details, Details -> Home, Add -> Home)
    if (s.activeSystemPage === 'edit' || s.activeSystemPage === 'history') {
      setActiveSystemPage('details');
      return true;
    }
    if (s.activeSystemPage === 'details') {
      setActiveSystemPage(null);
      setSelectedDetailsMedicine(null);
      return true;
    }
    if (s.activeSystemPage === 'add') {
      setActiveSystemPage(null);
      setEditingMedicine(null);
      return true;
    }

    // 6. Camera
    if (s.isCameraOpen) {
      setIsCameraOpen(false);
      setExtractionError(null);
      return true;
    }

    // 7. Mailbox, Chat, Settings & Login
    if (s.isMailboxOpen) {
      setIsMailboxOpen(false);
      setIsSettingsOpen(true);
      return true;
    }
    if (s.isChatOpen) {
      setIsChatOpen(false);
      return true;
    }
    if (s.isSettingsOpen) {
      setIsSettingsOpen(false);
      return true;
    }
    if (s.isEmailLoginOpen) {
      setIsEmailLoginOpen(false);
      return true;
    }

    // 8. Multi-Selection Mode
    if (s.isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedMedicineIds(new Set());
      return true;
    }

    // 9. Active Search or Filters
    if (s.searchQuery && s.searchQuery.trim().length > 0) {
      setSearchQuery('');
      return true;
    }
    if (s.filter !== 'all' || s.isLikedOnly) {
      setFilter('all');
      setIsLikedOnly(false);
      return true;
    }

    // Return false when at root dashboard -> native double-tap exit with toast and haptic
    return false;
  }, []);

  // Dynamically update native hardware back listener
  useEffect(() => {
    setNativeBackButtonHandler(handleGlobalBackNavigation);
  }, [handleGlobalBackNavigation]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initNativePerformance({
      handleBackButton: handleGlobalBackNavigation,
    }).then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [handleGlobalBackNavigation]);

  // Mobile Edge-Swipe navigation from left edge to navigate back
  useEdgeSwipeBack({
    onBack: handleGlobalBackNavigation,
    enabled: Boolean(
      publicPage ||
      activeSystemPage ||
      isCameraOpen ||
      isSettingsOpen ||
      isChatOpen ||
      isMailboxOpen ||
      activeFooterModal ||
      isInteractionModalOpen ||
      searchQuery ||
      filter !== 'all' ||
      isLikedOnly
    ),
  });

  // Mobile Pull-To-Refresh on main dashboard
  const handleDashboardRefresh = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'medicines'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine));
      // Deduplicate by ID to prevent duplicate React keys
      const uniqueMeds = Array.from(new Map(data.map(m => [m.id, m])).values());
      setMedicines(uniqueMeds);
    } catch (e) {
      console.warn('Pull-to-refresh sync:', e);
    }
  };

  const { pullDistance, isRefreshing: isPullRefreshing } = usePullToRefresh({
    onRefresh: handleDashboardRefresh,
    enabled: !publicPage && !activeSystemPage && !isCameraOpen && !isChatOpen && !isSettingsOpen && !activeFooterModal,
  });

  // Sync User Config from Firestore
  useEffect(() => {
    if (!user) return;

    const configRef = doc(db, 'userConfigs', user.uid);
    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.alertThreshold) setAlertThreshold(data.alertThreshold);
        if (data.lowQuantityThreshold !== undefined) setLowQuantityThreshold(data.lowQuantityThreshold);
        if (data.accentColor) setAccentColor(data.accentColor);
        if (data.emailNotificationsEnabled !== undefined) setEmailNotificationsEnabled(data.emailNotificationsEnabled);
        if (data.browserNotificationsEnabled !== undefined) setBrowserNotificationsEnabled(data.browserNotificationsEnabled);
        if (data.sortOrder) setSortOrder(data.sortOrder);
        if (data.theme) setTheme(data.theme);
      } else {
        // Initialize default config
        if (user.email) {
          setDoc(configRef, {
            userId: user.uid,
            email: user.email,
            emailNotificationsEnabled: false,
            browserNotificationsEnabled: false,
            alertThreshold: 90,
            lowQuantityThreshold: 5,
            accentColor: '#f97316',
            sortOrder: 'default',
            theme: 'system'
          }).catch(err => {
            console.warn('Initial userConfig creation sync deferred:', err);
          });
        }
      }
    }, (error) => {
      console.warn('userConfigs snapshot notice (offline/reconnecting):', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Sync Medicines from Firestore
  useEffect(() => {
    if (!user) {
      setMedicines([]);
      return;
    }

    const q = query(
      collection(db, 'medicines'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const medsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine));
      // Deduplicate by ID to prevent React "duplicate key" warnings during sync lag or accidental duplicates
      const uniqueMeds = Array.from(new Map(medsData.map(m => [m.id, m])).values());
      setMedicines(uniqueMeds);
    }, (error) => {
      console.warn('medicines snapshot notice (offline/reconnecting):', error);
    });

    return () => unsubscribe();
  }, [user]);

  // Native Android Closed-App Notifications Setup
  // Requests Android POST_NOTIFICATIONS permission and creates notification channels
  useEffect(() => {
    initNativeNotifications();
  }, []);

  // Synchronize scheduled local notifications for medicine expiry dates
  // Ensures heads-up reminders appear on user's phone even when the app is closed
  useEffect(() => {
    if (medicines.length > 0) {
      scheduleNativeMedicineAlerts(medicines, alertThreshold);
    }
  }, [medicines, alertThreshold]);

  // Background Notification Check (Browser and Email)
  useEffect(() => {
    if (medicines.length === 0) return;

    const checkAndNotify = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // 1. Browser & Chrome Notification Alert
      if (browserNotificationsEnabled && isBrowserNotificationSupported()) {
        checkAndTriggerBrowserExpiryNotifications(medicines, alertThreshold).catch(err => {
          console.warn('Browser notification check warning:', err);
        });
      }

      // 2. Synchronize active medicine expiry schedule with the backend server.
      // The backend cron worker runs 24/7 in the background on Render and is responsible
      // for dispatching expiry emails ONCE per stage while the app is closed.
      // Opening the app on 1, 2, or more devices will NEVER trigger duplicate emails!
      if (user?.uid && user?.email) {
        syncExpiryScheduleWithServer(
          user.uid,
          user.email,
          emailNotificationsEnabled,
          medicines
        );
      }
    };

    // Check periodically without spamming on every app launch
    const interval = setInterval(checkAndNotify, 4 * 60 * 60 * 1000);
    checkAndNotify();

    return () => clearInterval(interval);
  }, [medicines, browserNotificationsEnabled, emailNotificationsEnabled, alertThreshold, lowQuantityThreshold, user]);

  useEffect(() => {
    const applyThemeAndAccent = () => {
      document.documentElement.classList.remove('dark');
      let color = accentColor;
      if (color === '#ffffff') {
        color = '#111827';
      }
      document.documentElement.style.setProperty('--accent-color', color);
    };

    applyThemeAndAccent();
  }, [accentColor]);

  // Synchronize Notifications toggle state with Android / OS system notification permission
  useEffect(() => {
    const syncNotificationPermissionWithSystem = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const pushPerm = await PushNotifications.checkPermissions();
          if (pushPerm.receive === 'denied') {
            setBrowserNotificationsEnabled(false);
          } else if (pushPerm.receive === 'granted') {
            setBrowserNotificationsEnabled(true);
          }
          return;
        } catch (e) {}
      }

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'denied') {
          // If closed in Android phone settings, show closed/off in the app
          setBrowserNotificationsEnabled(false);
        } else if (Notification.permission === 'granted') {
          // If allowed in Android phone settings, show on in the app
          setBrowserNotificationsEnabled(true);
        }
      }
    };

    // Run on mount
    syncNotificationPermissionWithSystem();

    // Check whenever user switches between Android settings and the app
    window.addEventListener('focus', syncNotificationPermissionWithSystem);
    document.addEventListener('visibilitychange', syncNotificationPermissionWithSystem);

    // Listen to Permissions API change event if supported (Chrome on Android & desktop)
    let permStatus: PermissionStatus | null = null;
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then((status) => {
        permStatus = status;
        const onPermChange = () => {
          if (status.state === 'denied') {
            setBrowserNotificationsEnabled(false);
            if (user?.uid) {
              handleUpdateConfig({ browserNotificationsEnabled: false });
            }
          } else if (status.state === 'granted') {
            setBrowserNotificationsEnabled(true);
            if (user?.uid) {
              handleUpdateConfig({ browserNotificationsEnabled: true });
            }
          }
        };
        status.addEventListener('change', onPermChange);
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('focus', syncNotificationPermissionWithSystem);
      document.removeEventListener('visibilitychange', syncNotificationPermissionWithSystem);
      if (permStatus) {
        permStatus.onchange = null;
      }
    };
  }, [user?.uid]);

  useEffect(() => {
    if (user) {
      const hasNotification = typeof window !== 'undefined' && 'Notification' in window && typeof Notification !== 'undefined';

      // Check for expiring medicines and notify
      const checkExpiring = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        medicines.forEach(med => {
          if (med.taken || med.isDeleted) return;
          
          const [year, month, day] = med.expirationDate.split('-').map(Number);
          const expiry = new Date(year, month - 1, day);
          expiry.setHours(0, 0, 0, 0);
          
          const diffTime = expiry.getTime() - today.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 0 && diffDays <= 7) {
            if (hasNotification && Notification.permission === 'granted') {
              try {
                if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                  navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification('Medicine Expiring Soon', {
                      body: `${med.name} expires in ${diffDays} days.`,
                      icon: '/favicon.ico'
                    });
                  }).catch(() => {
                    try {
                      new window.Notification('Medicine Expiring Soon', {
                        body: `${med.name} expires in ${diffDays} days.`,
                        icon: '/favicon.ico'
                      });
                    } catch (e) {}
                  });
                } else {
                  new window.Notification('Medicine Expiring Soon', {
                    body: `${med.name} expires in ${diffDays} days.`,
                    icon: '/favicon.ico'
                  });
                }
              } catch (e) {
                console.warn('Notification not supported:', e);
              }
            }
          }
        });
      };

      // Run check once on load after medicines are fetched
      if (medicines.length > 0) {
        const lastCheck = localStorage.getItem('lastExpiryCheck');
        const todayStr = new Date().toDateString();
        if (lastCheck !== todayStr) {
          checkExpiring();
          localStorage.setItem('lastExpiryCheck', todayStr);
        }
      }
    }
  }, [user, medicines]);

  const handleLogin = async () => {
    try {
      const res = await signInWithGoogleAdaptive();
      if (res.success) {
        trackEvent('login', { method: 'google' });
      } else if (!res.isCancelled) {
        setAlertMessage(res.error || 'Failed to sign in with Google. Please try again.');
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // Silently handle popup closure
        return;
      }
      console.error("Login Error:", error);
      setAlertMessage('Failed to sign in with Google. Please try again.');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      trackEvent('login', { method: 'email' });
    } catch (error: any) {
      console.warn('Email login warning:', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        // If this is a reviewer or demo account, auto-provision so Play Store & Indus reviewers can log in without failure
        if (email.toLowerCase().includes('review') || email.toLowerCase().includes('tester') || email.toLowerCase().includes('playstore') || email.toLowerCase().includes('indus')) {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
            trackEvent('login', { method: 'reviewer_auto_provision' });
            return;
          } catch (createErr: any) {
            console.warn('Auto provision reviewer account failed:', createErr);
          }
        }
        setAlertMessage('Invalid email or password. Please check your credentials or sign up if you don\'t have an account.');
      } else if (error.code === 'auth/user-disabled') {
        setAlertMessage('This account has been disabled.');
      } else {
        setAlertMessage('An error occurred during login. Please try again.');
      }
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setAlertMessage('Password must be at least 6 characters long.');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      trackEvent('sign_up', { method: 'email' });
    } catch (error: any) {
      console.warn('Email sign up warning:', error);
      if (error.code === 'auth/email-already-in-use') {
        setAlertMessage('This email is already in use. Please try logging in instead.');
      } else if (error.code === 'auth/invalid-email') {
        setAlertMessage('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setAlertMessage('The password is too weak.');
      } else {
        setAlertMessage('An error occurred during sign up. Please try again.');
      }
    }
  };

  const handlePasswordReset = async () => {
    if (!email || !email.trim()) {
      setAlertMessage('Please enter your email address in the input field first, then click "Forgot Password" to receive a reset link.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setPasswordResetEmailSent(email.trim());
      trackEvent('password_reset');
    } catch (error: any) {
      console.warn('Password reset warning:', error);
      if (error.code === 'auth/user-not-found') {
        setAlertMessage('No user account found with this email address.');
      } else if (error.code === 'auth/invalid-email') {
        setAlertMessage('Please enter a valid email address.');
      } else {
        setAlertMessage('Failed to send password reset email: ' + (error.message || String(error)));
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOutAdaptive();
      trackEvent('logout');
      // Reset UI states on logout
      setIsSettingsOpen(false);
      setIsEmailLoginOpen(false);
      setAuthStep('email');
      setPassword('');
      setShowPassword(false);
      setIsSignUp(false);
      setIsCameraOpen(false);
      setActiveFooterModal(null);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleAddManual = () => {
    setEditingMedicine(null);
    setExtractionWarning(null);
    setActiveSystemPage('add');
  };

  const handleOpenDetails = (medicine: Medicine) => {
    setSelectedDetailsMedicine(medicine);
    setActiveSystemPage('details');
  };

  const handleSaveFromEditPage = async (data: Partial<Medicine>) => {
    if (!user || isSaving || !currentDetailsMedicine) return;
    setIsSaving(true);

    try {
      const { capturedImage, ...firestoreData } = data;
      let imageUrl = data.imageUrl;
      let localImageToSave: string | null = null;

      if (capturedImage && capturedImage.startsWith('data:image')) {
        imageUrl = 'local';
        localImageToSave = capturedImage;
      }

      const medRef = doc(db, 'medicines', currentDetailsMedicine.id);
      const updateData: any = { 
        ...currentDetailsMedicine, 
        ...firestoreData, 
        userId: user.uid,
        imageUrl: imageUrl || currentDetailsMedicine.imageUrl || null,
        updatedAt: serverTimestamp()
      };

      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          updateData[key] = deleteField();
        }
      });

      const batch = writeBatch(db);
      batch.set(medRef, updateData, { merge: true });

      const changes: string[] = [];
      if (data.name && currentDetailsMedicine.name !== data.name) {
        changes.push(`Name: "${currentDetailsMedicine.name}" → "${data.name}"`);
      }
      const oldCat = currentDetailsMedicine.category || 'Other';
      const newCat = data.category || 'Other';
      if (data.category !== undefined && oldCat.toLowerCase() !== newCat.toLowerCase()) {
        changes.push(`Category: "${oldCat}" → "${newCat}"`);
      }
      if (data.expirationDate && currentDetailsMedicine.expirationDate !== data.expirationDate) {
        changes.push(`Exp Date: ${currentDetailsMedicine.expirationDate || 'None'} → ${data.expirationDate}`);
      }
      if (data.quantity !== undefined && currentDetailsMedicine.quantity !== data.quantity) {
        changes.push(`Qty: ${currentDetailsMedicine.quantity ?? 0} → ${data.quantity}`);
      }
      const oldSched = currentDetailsMedicine.schedule || '';
      const newSched = data.schedule || '';
      if (data.schedule !== undefined && oldSched !== newSched) {
        changes.push(`Schedule: ${oldSched ? `"${oldSched}"` : 'None'} → ${newSched ? `"${newSched}"` : 'None'}`);
      }
      if (data.dosage && currentDetailsMedicine.dosage !== data.dosage) {
        changes.push(`Dosage: ${currentDetailsMedicine.dosage || 'None'} → ${data.dosage}`);
      }
      if (data.form && currentDetailsMedicine.form !== data.form) {
        changes.push(`Form: ${currentDetailsMedicine.form || 'other'} → ${data.form}`);
      }
      const oldInst = (currentDetailsMedicine.usageInstructions || '').trim();
      const newInst = (data.usageInstructions || '').trim();
      if (data.usageInstructions !== undefined && oldInst !== newInst) {
        changes.push(`Usage Instructions updated`);
      }
      
      const historyId = crypto.randomUUID();
      batch.set(doc(db, `medicines/${currentDetailsMedicine.id}/history`, historyId), {
        id: historyId,
        medicineId: currentDetailsMedicine.id,
        userId: user.uid,
        timestamp: Date.now(),
        actionType: 'EDIT',
        details: `Updated: ${changes.join(', ') || 'Medication details modified'}`
      });

      await batch.commit();

      if (localImageToSave) {
        await localImageStorage.saveImage(currentDetailsMedicine.id, localImageToSave);
      }

      triggerSuccessHaptic();
      
      setSelectedDetailsMedicine(prev => prev ? ({ ...prev, ...firestoreData, imageUrl: imageUrl || prev.imageUrl }) : null);
      setActiveSystemPage('details');
    } catch (error: any) {
      console.error('Save from edit page error:', error);
      setAlertMessage("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (medicine: Medicine) => {
    handleOpenDetails(medicine);
  };

  const handleCheckInteractions = async () => {
    if (medicines.length < 2) {
      setAlertMessage("You need at least 2 medicines to check for interactions.");
      return;
    }

    setIsCheckingInteractions(true);
    try {
      const activeMedicines = medicines.filter(m => !m.isDeleted);
      const result = await checkDrugInteractions(activeMedicines.map(m => ({ name: m.name, dosage: m.dosage })));
      setInteractionResult(result);
      setIsInteractionModalOpen(true);
      trackEvent('check_interactions', { count: activeMedicines.length });
    } catch (error) {
      console.error("Interaction check failed:", error);
      setAlertMessage("Failed to check interactions. Please try again.");
    } finally {
      setIsCheckingInteractions(false);
    }
  };

  const handleSave = async (data: Partial<Medicine>) => {
    if (!user || isSaving) return;
    setIsSaving(true);

    try {
      const { capturedImage, ...firestoreData } = data;
      let imageUrl = data.imageUrl;
      let localImageToSave: string | null = null;

      if (capturedImage && capturedImage.startsWith('data:image')) {
        imageUrl = 'local';
        localImageToSave = capturedImage;
      }

      const normalizedName = (firestoreData.name || '').toLowerCase().trim();
      const existingMed = medicines.find(m => 
        m.name.toLowerCase().trim() === normalizedName &&
        m.expirationDate === firestoreData.expirationDate &&
        (!editingMedicine || m.id !== editingMedicine.id)
      );

      const batch = writeBatch(db);
      let targetId = '';

      if (existingMed) {
        targetId = existingMed.id;
        const medRef = doc(db, 'medicines', existingMed.id);
        const currentQty = existingMed.quantity || 0;
        const addedQty = firestoreData.quantity || 0;
        const newQuantity = currentQty + addedQty;

        const updateData: any = { 
          quantity: newQuantity,
          userId: user.uid,
          imageUrl: imageUrl || existingMed.imageUrl || null,
          updatedAt: serverTimestamp() // Ensure cloud sync timestamp
        };

        if (existingMed.dosage === 'N/A' && firestoreData.dosage) {
          updateData.dosage = firestoreData.dosage;
        }
        if (!existingMed.usageInstructions && firestoreData.usageInstructions) {
          updateData.usageInstructions = firestoreData.usageInstructions;
        }
        if (firestoreData.schedule || existingMed.schedule) {
          updateData.schedule = firestoreData.schedule || existingMed.schedule || null;
        }
        if (firestoreData.category || existingMed.category) {
          updateData.category = firestoreData.category || existingMed.category;
        }
        if (firestoreData.tags || existingMed.tags) {
          const mergedTags = Array.from(new Set([...(existingMed.tags || []), ...(firestoreData.tags || [])]));
          if (mergedTags.length > 0) updateData.tags = mergedTags;
        }

        batch.set(medRef, updateData, { merge: true });

        const historyId = crypto.randomUUID();
        batch.set(doc(db, `medicines/${existingMed.id}/history`, historyId), {
          id: historyId,
          medicineId: existingMed.id,
          userId: user.uid,
          timestamp: Date.now(),
          actionType: 'EDIT',
          details: `Cloud Sync: Merged duplicates. Quantity updated to ${newQuantity}.`
        });

        if (editingMedicine && editingMedicine.id) {
          batch.delete(doc(db, 'medicines', editingMedicine.id));
        }
      } else if (editingMedicine && editingMedicine.id) {
        targetId = editingMedicine.id;
        const medRef = doc(db, 'medicines', editingMedicine.id);
        const updateData: any = { 
          ...editingMedicine, 
          ...firestoreData, 
          userId: user.uid,
          imageUrl: imageUrl || editingMedicine.imageUrl || null,
          updatedAt: serverTimestamp()
        };

        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            updateData[key] = deleteField();
          }
        });
        batch.set(medRef, updateData, { merge: true });
        
        const changes: string[] = [];
        if (data.name && editingMedicine.name !== data.name) {
          changes.push(`Name: "${editingMedicine.name}" → "${data.name}"`);
        }
        const oldCat = editingMedicine.category || 'Other';
        const newCat = data.category || 'Other';
        if (data.category !== undefined && oldCat.toLowerCase() !== newCat.toLowerCase()) {
          changes.push(`Category: "${oldCat}" → "${newCat}"`);
        }
        if (data.expirationDate && editingMedicine.expirationDate !== data.expirationDate) {
          changes.push(`Exp Date: ${editingMedicine.expirationDate || 'None'} → ${data.expirationDate}`);
        }
        if (data.quantity !== undefined && editingMedicine.quantity !== data.quantity) {
          changes.push(`Qty: ${editingMedicine.quantity ?? 0} → ${data.quantity}`);
        }
        const oldSched = editingMedicine.schedule || '';
        const newSched = data.schedule || '';
        if (data.schedule !== undefined && oldSched !== newSched) {
          changes.push(`Schedule: ${oldSched ? `"${oldSched}"` : 'None'} → ${newSched ? `"${newSched}"` : 'None'}`);
        }
        if (data.dosage && editingMedicine.dosage !== data.dosage) {
          changes.push(`Dosage: ${editingMedicine.dosage || 'None'} → ${data.dosage}`);
        }
        if (data.form && editingMedicine.form !== data.form) {
          changes.push(`Form: ${editingMedicine.form || 'other'} → ${data.form}`);
        }
        const oldInst = (editingMedicine.usageInstructions || '').trim();
        const newInst = (data.usageInstructions || '').trim();
        if (data.usageInstructions !== undefined && oldInst !== newInst) {
          changes.push(`Usage Instructions updated`);
        }
        
        const historyId = crypto.randomUUID();
        batch.set(doc(db, `medicines/${editingMedicine.id}/history`, historyId), {
          id: historyId,
          medicineId: editingMedicine.id,
          userId: user.uid,
          timestamp: Date.now(),
          actionType: 'EDIT',
          details: `Updated: ${changes.join(', ') || 'Metadata updated'}`
        });
      } else {
        const id = crypto.randomUUID();
        targetId = id;
        const newMed: any = {
          id,
          name: firestoreData.name || 'Unknown',
          dosage: firestoreData.dosage || 'N/A',
          expirationDate: firestoreData.expirationDate || new Date().toISOString().split('T')[0],
          usageInstructions: firestoreData.usageInstructions || '',
          schedule: firestoreData.schedule || '',
          createdAt: serverTimestamp(),
          userId: user.uid,
          form: firestoreData.form || 'other',
          imageUrl: imageUrl || null
        };

        if (firestoreData.quantity !== undefined) {
          newMed.quantity = firestoreData.quantity;
        }
        if (firestoreData.category) {
          newMed.category = firestoreData.category;
        }
        if (firestoreData.tags && Array.isArray(firestoreData.tags)) {
          newMed.tags = firestoreData.tags;
        }
        if (firestoreData.enableLowStockAlert !== undefined) {
          newMed.enableLowStockAlert = firestoreData.enableLowStockAlert;
        }
        if (firestoreData.lowStockThreshold !== undefined) {
          newMed.lowStockThreshold = firestoreData.lowStockThreshold;
        }
        if (firestoreData.enableEmailExpiryAlert !== undefined) {
          newMed.enableEmailExpiryAlert = firestoreData.enableEmailExpiryAlert;
        }
        if (firestoreData.enableEmailLowStockAlert !== undefined) {
          newMed.enableEmailLowStockAlert = firestoreData.enableEmailLowStockAlert;
        }

        batch.set(doc(db, 'medicines', id), newMed);

        const historyId = crypto.randomUUID();
        batch.set(doc(db, `medicines/${id}/history`, historyId), {
          id: historyId,
          medicineId: id,
          userId: user.uid,
          timestamp: Date.now(),
          actionType: 'CREATE',
          details: 'Initial cloud record created.'
        });
      }

      // Commit all changes in ONE atomic operation
      await batch.commit();

      trackEvent('save_medication', { 
        form: data.form || 'other',
        is_edit: !!editingMedicine
      });

      if (localImageToSave && targetId) {
        await localImageStorage.saveImage(targetId, localImageToSave);
      }

      triggerSuccessHaptic();

      setEditingMedicine(null);
      setExtractionWarning(null);
      if (activeSystemPage === 'add') {
        setActiveSystemPage(null);
      }
    } catch (error: any) {
      console.error('Cloud Save Error:', error);
      setAlertMessage("Cloud sync failed. Please check your internet connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMultiple = async (ids: string[]) => {
    if (!user) return;
    try {
      const CHUNK_SIZE = 500;
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          const docRef = doc(db, 'medicines', id);
          batch.update(docRef, {
            isDeleted: true,
            deletedAt: Date.now()
          });
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'medicines');
    }
  };

  const handleToggleTaken = async (medicine: Medicine) => {
    if (!user) return;
    try {
      const medRef = doc(db, 'medicines', medicine.id);
      await setDoc(medRef, { taken: !medicine.taken }, { merge: true });
      triggerSuccessHaptic();
      trackEvent('toggle_taken', { is_taken: !medicine.taken });

      const historyId = crypto.randomUUID();
      await setDoc(doc(db, `medicines/${medicine.id}/history`, historyId), {
        id: historyId,
        medicineId: medicine.id,
        userId: user.uid,
        timestamp: Date.now(),
        actionType: !medicine.taken ? 'MARK_TAKEN' : 'MARK_NOT_TAKEN',
        details: !medicine.taken ? 'Marked as taken' : 'Marked as not taken'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'medicines');
    }
  };

  const handleToggleLike = async (medicine: Medicine) => {
    if (!user) return;
    const originalLiked = !!medicine.liked;
    const newLiked = !originalLiked;

    // 1. Optimistic Update - immediately toggle state for instant UI response
    setMedicines(prev => prev.map(m => m.id === medicine.id ? { ...m, liked: newLiked } : m));
    triggerSuccessHaptic();

    try {
      const medRef = doc(db, 'medicines', medicine.id);
      await updateDoc(medRef, { liked: newLiked });
    } catch (error) {
      // 2. Rollback state if the backend save fails (e.g. offline/permission error)
      setMedicines(prev => prev.map(m => m.id === medicine.id ? { ...m, liked: originalLiked } : m));
      handleFirestoreError(error, OperationType.UPDATE, 'medicines');
    }
  };

  const handleReduceQuantity = async (medicine: Medicine) => {
    if (!user || medicine.quantity === undefined || medicine.quantity <= 0) return;
    try {
      const newQuantity = medicine.quantity - 1;
      const isFinished = newQuantity === 0;
      const medRef = doc(db, 'medicines', medicine.id);
      
      const updateData: any = { quantity: newQuantity };
      if (isFinished) {
        updateData.taken = true;
      }
      
      await setDoc(medRef, updateData, { merge: true });
      triggerSuccessHaptic();

      const historyId = crypto.randomUUID();
      await setDoc(doc(db, `medicines/${medicine.id}/history`, historyId), {
        id: historyId,
        medicineId: medicine.id,
        userId: user.uid,
        timestamp: Date.now(),
        actionType: 'EDIT',
        details: `Quantity reduced to ${newQuantity}${isFinished ? ' (Marked as finished)' : ''}`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'medicines');
    }
  };

  const [isCategorizing, setIsCategorizing] = useState(false);

  const handleAutoCategorize = async () => {
    if (isCategorizing) return;
    const activeMeds = medicines.filter(m => !m.isDeleted);
    if (activeMeds.length === 0) {
      setAlertMessage("No active medicines found to organize.");
      return;
    }

    setIsCategorizing(true);
    try {
      const medsPayload = activeMeds.map(m => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        usageInstructions: m.usageInstructions,
        form: m.form
      }));

      const categorizedList = await categorizeMedicinesWithAI(medsPayload);
      if (categorizedList && categorizedList.length > 0) {
        const updatesMap = new Map(categorizedList.map(item => [item.id, item]));

        // 1. Optimistic React state update so UI re-renders with new categories instantly in Android & Web
        setMedicines(prev => prev.map(m => {
          const update = updatesMap.get(m.id);
          if (!update) return m;
          return {
            ...m,
            category: update.category || m.category || 'General Care',
            form: (update.form as MedicineFormType) || m.form || 'tablet',
            updatedAt: Date.now()
          };
        }));

        setSelectedDetailsMedicine(prev => {
          if (!prev) return prev;
          const update = updatesMap.get(prev.id);
          if (!update) return prev;
          return {
            ...prev,
            category: update.category || prev.category || 'General Care',
            form: (update.form as MedicineFormType) || prev.form || 'tablet'
          };
        });

        // 2. Hide organize banner immediately
        try {
          sessionStorage.setItem('dawalens_hide_organize_banner', 'true');
          localStorage.setItem('dawalens_medicines_organized', 'true');
        } catch {}

        // 3. Persist to Firestore if user logged in
        if (user) {
          try {
            const batch = writeBatch(db);
            categorizedList.forEach(item => {
              if (item && item.id) {
                const medRef = doc(db, 'medicines', item.id);
                const updates: any = {
                  updatedAt: serverTimestamp()
                };
                if (item.category) updates.category = item.category;
                if (item.form) updates.form = item.form;
                batch.update(medRef, updates);
              }
            });
            await batch.commit();
          } catch (dbErr) {
            console.warn("Firestore batch sync deferred/offline:", dbErr);
          }
        }

        triggerSuccessHaptic();
        setAlertMessage(`Successfully organized ${categorizedList.length} medicines with AI Pharmacist!`);
        trackEvent('ai_categorize_batch', { count: categorizedList.length });
      } else {
        setAlertMessage("Could not organize medicines at this time.");
      }
    } catch (err: any) {
      console.error("Auto categorize failed:", err);
      setAlertMessage("Failed to auto-organize with AI Pharmacist: " + (err.message || String(err)));
    } finally {
      setIsCategorizing(false);
    }
  };

  const confirmClearData = async () => {
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      const CHUNK_SIZE = 100; // Smaller chunk for complex deletes (includes history)
      const allMeds = [...medicines];
      
      for (let i = 0; i < allMeds.length; i += CHUNK_SIZE) {
        const chunk = allMeds.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(med => handlePermanentDelete(med.id)));
      }
      setAlertMessage("All data cleared successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'medicines');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateConfig = async (updates: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'userConfigs', user.uid), updates, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'userConfigs');
    }
  };

  const handleCapture = async (base64: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setExtractionError(null);
    setExtractionWarning(null);
    const result = await extractMedicineData(base64);
    setIsProcessing(false);
    
    if (result.success && result.medicine) {
      trackEvent('capture_image', { success: true });
      setEditingMedicine(null);
      
      const cleanString = (val: any, fallback: string = '') => {
        if (!val || typeof val !== 'string') return fallback;
        const trimmed = val.trim();
        if (trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') return fallback;
        return trimmed;
      };

      // Pre-fill form with extracted data, ensuring NO "null" text ever shows up
      const defaultDate = new Date();
      defaultDate.setFullYear(defaultDate.getFullYear() + 1);
      const fallbackExpiry = `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, '0')}-01`;

      const tempMed: Partial<Medicine> = {
        name: cleanString(result.medicine.name, 'Scanned Medicine'),
        dosage: cleanString(result.medicine.dosage, 'N/A'),
        expirationDate: cleanString(result.medicine.expirationDate, fallbackExpiry),
        usageInstructions: cleanString(result.medicine.usageInstructions, ''),
        capturedImage: `data:image/jpeg;base64,${base64}`,
        quantity: typeof result.medicine.quantity === 'number' && result.medicine.quantity > 0 ? result.medicine.quantity : 1,
        form: cleanString(result.medicine.form, 'tablet') as any,
      };
      // We don't save immediately, we let user verify in form
      setEditingMedicine(tempMed as Medicine);
      if (result.warningMessage) {
        setExtractionWarning(result.warningMessage);
      }
      setIsCameraOpen(false);
      setActiveSystemPage('add');
    } else {
      trackEvent('capture_image', { success: false, error_type: 'extraction_failed' });
      setExtractionError(result.errorMessage || "Could not read the label. Please ensure good lighting and a clear, focused image.");
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const importedMeds = results.data as any[];
        let count = 0;
        let mergedCount = 0;

        const batch = writeBatch(db);
        const existingMap = new Map<string, Medicine>();
        medicines.forEach(m => {
          const key = `${m.name.toLowerCase().trim()}_${m.expirationDate}`;
          existingMap.set(key, m);
        });
        
        const newMedsMap = new Map<string, any>();
        const existingUpdates = new Map<string, number>();

        for (const row of importedMeds) {
          // Map CSV headers to Medicine object
          // Expected headers: Name, Dosage, Expiration Date, Usage Instructions
          const name = row['Name'] || row['name'];
          const dosage = row['Dosage'] || row['dosage'];
          const quantityRaw = row['Quantity'] || row['quantity'] || row['Count'] || row['count'];
          const quantity = quantityRaw ? parseInt(quantityRaw, 10) : undefined;
          const expirationDateRaw = row['Expiration Date'] || row['expirationDate'] || row['expiration_date'] || row['Expiry Date'] || row['expiryDate'] || row['expiry_date'];
          const usageInstructions = row['Usage Instructions'] || row['usageInstructions'] || row['usage_instructions'] || row['Notes'] || row['notes'] || '';
          const form = (row['Form'] || row['form'] || 'other').toLowerCase();
          const validForm = ['tablet', 'capsule', 'syrup', 'ampule', 'powder', 'tape', 'liquid', 'other'].includes(form) ? form : 'other';

          if (name && expirationDateRaw) {
            let expirationDate = expirationDateRaw;
            // Try to format date to YYYY-MM-DD if it's not already
            if (!/^\d{4}-\d{2}-\d{2}$/.test(expirationDateRaw)) {
              try {
                const d = new Date(expirationDateRaw);
                if (!isNaN(d.getTime())) {
                  expirationDate = d.toISOString().split('T')[0];
                } else {
                  // Skip invalid dates
                  continue;
                }
              } catch (e) {
                // Skip invalid dates
                continue;
              }
            }

            const key = `${name.toLowerCase().trim()}_${expirationDate}`;
            const addQty = quantity !== undefined && !isNaN(quantity) && quantity >= 0 ? quantity : 0;

            if (existingMap.has(key)) {
              const existingMed = existingMap.get(key)!;
              const currentTotal = existingUpdates.has(existingMed.id) 
                ? existingUpdates.get(existingMed.id)! 
                : (existingMed.quantity || 0);
              existingUpdates.set(existingMed.id, currentTotal + addQty);
              mergedCount++;
            } else if (newMedsMap.has(key)) {
              const newMed = newMedsMap.get(key)!;
              newMed.quantity = (newMed.quantity || 0) + addQty;
              mergedCount++;
            } else {
              const id = crypto.randomUUID();
              const newMed: any = {
                id,
                name,
                dosage: dosage || 'N/A',
                expirationDate,
                usageInstructions,
                createdAt: Date.now(),
                userId: user.uid,
                form: validForm,
                ...(quantity !== undefined && !isNaN(quantity) ? { quantity: addQty } : {}),
              };
              newMedsMap.set(key, newMed);
              count++;
            }
          }
        }
        
        try {
          // Process in chunks of 500 (Firestore batch limit)
          const CHUNK_SIZE = 500;
          
          // Combine all operations
          const allOperations: { type: 'set' | 'update', ref: any, data: any }[] = [];
          
          for (const [id, newQty] of existingUpdates.entries()) {
            allOperations.push({ type: 'update', ref: doc(db, 'medicines', id), data: { quantity: newQty } });
          }
          
          for (const newMed of newMedsMap.values()) {
            allOperations.push({ type: 'set', ref: doc(db, 'medicines', newMed.id), data: newMed });
          }

          if (allOperations.length > 0) {
            for (let i = 0; i < allOperations.length; i += CHUNK_SIZE) {
              const chunk = allOperations.slice(i, i + CHUNK_SIZE);
              const batch = writeBatch(db);
              chunk.forEach(op => {
                if (op.type === 'set') batch.set(op.ref, op.data);
                else batch.update(op.ref, op.data);
              });
              await batch.commit();
            }
            setAlertMessage(`Successfully imported ${count} new medicines and merged ${mergedCount} duplicates.`);
            trackEvent('import_csv', { count, merged_count: mergedCount });
          } else {
            setAlertMessage("No valid medicines found to import.");
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'medicines');
        }
        
        // Reset input
        event.target.value = '';
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        setAlertMessage("Failed to parse CSV file. Please ensure it's a valid Google Sheets export.");
      }
    });
  };

  const exportToSheets = () => {
    const activeMedicines = medicines.filter(m => !m.isDeleted);
    if (activeMedicines.length === 0) {
      setAlertMessage("No active medicines to export.");
      return;
    }

    const data = activeMedicines.map((m, index) => ({
      'Name': m.name,
      'Dosage': m.dosage,
      'Quantity': m.quantity !== undefined ? m.quantity : '',
      'Expiration Date': m.expirationDate,
      'Usage Instructions': m.usageInstructions,
      'Alert Formula': `=IF(TODAY() >= (D${index + 2} - 90), "ALERT: 3 Months", IF(TODAY() >= (D${index + 2} - 10), "ALERT: 10 Days", "OK"))`
    }));

    const csvContent = Papa.unparse(data);
    trackEvent('export_sheets', { count: activeMedicines.length });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dawalens_ai_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deletedMedicines = medicines.filter(m => m.isDeleted);

  const handlePermanentDelete = async (id: string) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      
      // Delete all history documents
      const historyRef = collection(db, 'medicines', id, 'history');
      const historySnapshot = await getDocs(historyRef);
      historySnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete the medicine document
      batch.delete(doc(db, 'medicines', id));
      
      await batch.commit();

      // Clean up local image storage
      await localImageStorage.deleteImage(id);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'medicines');
    }
  };

  // Cleanup old deleted medicines
  useEffect(() => {
    if (!user || deletedMedicines.length === 0) return;
    
    const cleanup = async () => {
      const now = Date.now();
      const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
      
      const toDelete = deletedMedicines.filter(m => m.deletedAt && (now - m.deletedAt > fifteenDaysMs));
      
      if (toDelete.length > 0) {
        try {
          for (const m of toDelete) {
            await handlePermanentDelete(m.id);
          }
        } catch (error) {
          console.error("Cleanup error:", error);
        }
      }
    };
    
    cleanup();
  }, [user, deletedMedicines]);

  const handleRestore = async (id: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'medicines', id), {
        isDeleted: false,
        deletedAt: null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'medicines');
    }
  };

  const filteredMedicines = React.useMemo(() => {
    return medicines.filter(m => {
      if (m.isDeleted) return false;
      if (isLikedOnly && !m.liked) return false;

      // 1. Search Query Match
      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          (m.name || '').toLowerCase().includes(searchLower) ||
          (m.dosage || '').toLowerCase().includes(searchLower) ||
          (m.usageInstructions || '').toLowerCase().includes(searchLower) ||
          (m.category || '').toLowerCase().includes(searchLower) ||
          (m.form || '').toLowerCase().includes(searchLower) ||
          (Array.isArray(m.tags) && m.tags.some(t => t.toLowerCase().includes(searchLower)));

        if (!matchesSearch) return false;
      }

      // 2. Dropdown Category & Form Filter (universal canonical matching)
      if (selectedCategory !== 'ALL') {
        if (!isCategoryMatch(m, selectedCategory)) {
          return false;
        }
      }

      // 3. Status/Pill Filters
      if (filter === 'all') {
        // When a specific category is selected, show all medicines of that category.
        // When viewing all categories, show active & expired (exclude taken from main list).
        if (selectedCategory !== 'ALL') {
          return true;
        }
        return !m.taken;
      }

      if (filter === 'taken') {
        return m.taken === true;
      }

      // Do not include taken medicines in expiry views
      if (m.taken) return false;

      if (!m.expirationDate) return false;

      const diffDays = calculateDiffDays(m.expirationDate);
      const effectiveThreshold = alertThreshold === 90 ? 92 : alertThreshold;

      if (filter === 'expired') return diffDays < 0;
      if (filter === 'expiring_soon') return diffDays >= 0 && diffDays <= 10;
      if (filter === 'expiring_3_months') return diffDays >= 0 && diffDays <= effectiveThreshold;
      if (filter === 'expiring_6_months') return diffDays >= 0 && diffDays <= 180;
      
      return true;
    }).sort((a, b) => {
      if (sortOrder === 'asc') return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
      if (sortOrder === 'desc') return (b.name || '').toLowerCase().localeCompare((a.name || '').toLowerCase());
      return 0;
    });
  }, [medicines, searchQuery, filter, sortOrder, alertThreshold, isLikedOnly, selectedCategory]);

  const categoryDropdownItems = React.useMemo(() => {
    const counts = new Map<string, number>();

    // Count medicines per clinical category
    medicines.forEach(m => {
      if (m.isDeleted) return;
      const canon = getMedicineCategory(m);
      counts.set(canon, (counts.get(canon) || 0) + 1);
    });

    const items: { category: string; count: number; accentColor: string }[] = [];
    const seen = new Set<string>();

    // Standard categories with accurate canonical counts
    MEDICINE_CATEGORIES.forEach(cat => {
      seen.add(cat.trim().toLowerCase());
      const style = getCategoryStyle(cat);
      items.push({
        category: cat,
        count: counts.get(cat) || 0,
        accentColor: style.accent
      });
    });

    // Check if any non-standard custom categories exist in user's medicines
    counts.forEach((count, cat) => {
      const cleanCat = (cat || '').trim();
      if (cleanCat && !seen.has(cleanCat.toLowerCase())) {
        seen.add(cleanCat.toLowerCase());
        const style = getCategoryStyle(cleanCat);
        items.push({
          category: cleanCat,
          count,
          accentColor: style.accent
        });
      }
    });

    // Sort categories: active ones (count > 0) first, ordered by count descending, then alphabetically
    items.sort((a, b) => {
      if (b.count > 0 && a.count === 0) return 1;
      if (a.count > 0 && b.count === 0) return -1;
      if (b.count !== a.count) return b.count - a.count;
      return a.category.localeCompare(b.category);
    });

    return items;
  }, [medicines]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#e3e2e0] border-t-[#0f9d58] rounded-full animate-spin" />
      </div>
    );
  }

  const reauthenticateUserSession = async (targetUser: User): Promise<void> => {
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      try {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        const res = await FirebaseAuthentication.signInWithGoogle();
        if (res.credential?.idToken) {
          const cred = GoogleAuthProvider.credential(res.credential.idToken);
          await reauthenticateWithCredential(targetUser, cred);
          return;
        }
      } catch (nativeErr) {
        console.warn("Native reauth error, falling back to popup:", nativeErr);
      }
    }
    const provider = new GoogleAuthProvider();
    await reauthenticateWithPopup(targetUser, provider);
  };

  const handleFullAccountDeletion = async () => {
    if (!user) {
      throw new Error("No active user session to delete.");
    }
    const currentUserId = user.uid;

    // STEP 1: Re-authenticate first to establish fresh credentials for secure deletion
    try {
      await reauthenticateUserSession(user);
    } catch (reauthErr: any) {
      console.warn("Re-auth verification notice:", reauthErr);
      if (reauthErr.code === 'auth/popup-closed-by-user' || reauthErr.code === 'auth/cancelled') {
        throw new Error("Re-authentication was cancelled. Deletion cannot proceed without identity verification.");
      }
    }

    // STEP 2: Call server purge with valid Bearer token (MUST SUCCEED or abort)
    const authHeaders = await getAuthHeader();
    const purgeResponse = await fetch(getApiUrl('/api/user/purge-data'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({})
    });

    if (!purgeResponse.ok) {
      const errBody = await purgeResponse.text();
      throw new Error(`Server data purge failed (${purgeResponse.status}): ${errBody}. Account deletion aborted.`);
    }

    // STEP 3: Delete Firestore data using batched writes
    let batch = writeBatch(db);
    let opCount = 0;

    // 3a. Medicines and history subcollections
    const snap = await getDocs(query(collection(db, 'medicines'), where('userId', '==', currentUserId)));
    for (const medDoc of snap.docs) {
      try {
        const histSnap = await getDocs(collection(db, 'medicines', medDoc.id, 'history'));
        for (const hDoc of histSnap.docs) {
          batch.delete(hDoc.ref);
          opCount++;
          if (opCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        }
      } catch (hErr) {
        console.warn('Subcollection history cleanup notice:', hErr);
      }
      batch.delete(medDoc.ref);
      opCount++;
      if (opCount >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    }

    // 3b. User configs & app settings
    batch.delete(doc(db, 'userConfigs', currentUserId));
    batch.delete(doc(db, 'users', currentUserId, 'settings', 'appSettings'));
    opCount += 2;

    // 3c. User chats and message subcollections
    try {
      const chatsSnap = await getDocs(collection(db, 'users', currentUserId, 'chats'));
      for (const chatDoc of chatsSnap.docs) {
        const msgSnap = await getDocs(collection(db, 'users', currentUserId, 'chats', chatDoc.id, 'messages'));
        for (const mDoc of msgSnap.docs) {
          batch.delete(mDoc.ref);
          opCount++;
          if (opCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        }
        batch.delete(chatDoc.ref);
        opCount++;
        if (opCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }
    } catch (chatsErr) {
      console.warn('chats cleanup notice:', chatsErr);
    }

    // 3d. SLM knowledge
    try {
      const slmSnap = await getDocs(collection(db, 'users', currentUserId, 'slmKnowledge'));
      for (const slmDoc of slmSnap.docs) {
        batch.delete(slmDoc.ref);
        opCount++;
        if (opCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }
    } catch (slmErr) {
      console.warn('SLM knowledge cleanup notice:', slmErr);
    }

    if (opCount > 0) {
      await batch.commit();
    }

    // STEP 4: Delete Auth user - MUST retry with reauthenticate if requires-recent-login
    try {
      await user.delete();
    } catch (authErr: any) {
      if (authErr?.code === 'auth/requires-recent-login') {
        console.warn('Requires recent login, prompting reauth and retrying deletion...');
        await reauthenticateUserSession(user);
        await user.delete();
      } else {
        throw new Error(`Authentication account deletion failed: ${authErr?.message || authErr}`);
      }
    }

    // STEP 5: Only after Auth deletion succeeds, clear local storage / IndexedDB
    try {
      await localImageStorage.clearAll();
    } catch (idbErr) {
      console.warn('IndexedDB clear warning:', idbErr);
    }
    localStorage.clear();
    sessionStorage.clear();

    // STEP 6: Anonymous deletion event without any PII / userId
    trackEvent('user_account_deleted');

    // STEP 7: Reset state
    setUser(null);
    setMedicines([]);
  };

  const handleBackFromPublicPage = () => {
    navigateToPublicPage(null);
    if (openedFromSettings) {
      setIsSettingsOpen(true);
      setOpenedFromSettings(false);
    }
  };

  // PUBLIC LEGAL & GUIDE PAGES (Google Search Console & Play Store Compliant - No Login Required)
  if (publicPage === 'guide') {
    return <UserGuidePage onBack={handleBackFromPublicPage} isLoggedIn={!!user} />;
  }
  if (publicPage === 'privacy') {
    return <PrivacyPolicyPage onBack={handleBackFromPublicPage} isLoggedIn={!!user} />;
  }
  if (publicPage === 'terms') {
    return <TermsOfServicePage onBack={handleBackFromPublicPage} isLoggedIn={!!user} />;
  }
  if (publicPage === 'delete-account') {
    return (
      <AccountDeletionPage 
        onBack={handleBackFromPublicPage} 
        user={user} 
        onExecuteAccountDeletion={handleFullAccountDeletion} 
      />
    );
  }

  if (!user) {
    const handleContinueEmail = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!email || !email.trim()) {
        setAlertMessage('Please enter your email address.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setAlertMessage('Please enter a valid email address.');
        return;
      }
      setAuthStep('password');
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (authStep === 'email') {
        handleContinueEmail(e);
        return;
      }
      if (!password) {
        setAlertMessage('Please enter your password.');
        return;
      }
      if (!agreedToTerms) {
        setAlertMessage('Please agree to our Terms of service and Privacy policy to proceed.');
        return;
      }
      if (isSignUp) {
        await handleEmailSignUp(e);
      } else {
        await handleEmailLogin(e);
      }
    };

    const handleGoogleSignInWithConsent = () => {
      if (!agreedToTerms) {
        setAlertMessage('Please agree to our Terms of service and Privacy policy to proceed.');
        return;
      }
      handleLogin();
    };

    return (
      <div className="min-h-screen bg-[#faf8f5] text-slate-800 font-sans flex flex-col items-center justify-between p-4 sm:p-6 selection:bg-[#0f9d58] selection:text-white">
        <div className="flex-1 flex flex-col items-center justify-center max-w-[400px] w-full my-auto space-y-6">
          {/* Logo & App Name Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3 text-center"
          >
            <div className="w-20 h-20 bg-white border border-[#e3e2e0] rounded-[28px] mx-auto flex items-center justify-center shadow-md">
              <Camera className="text-[#0f9d58]" size={38} />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#0f9d58]">
              DawaLens AI
            </h1>
          </motion.div>

          {/* Sign In / Create Account Heading (Centered, subtle styling) */}
          <h2 className="text-xl sm:text-2xl font-bold text-slate-600 text-center tracking-tight">
            {isSignUp ? 'Create account' : 'Sign in'}
          </h2>

          <form onSubmit={handleAuthSubmit} className="w-full space-y-4">
            {/* EMAIL FIELD */}
            <div className="space-y-1.5">
              <label 
                htmlFor="auth-email" 
                className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block"
              >
                EMAIL
              </label>
              <div className="relative flex items-center bg-white border-b-2 border-slate-300 focus-within:border-slate-700 transition-colors rounded-t-md shadow-2xs">
                <div className="pl-3.5 pr-2 text-slate-500 shrink-0">
                  <Mail size={18} />
                </div>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && authStep === 'email') {
                      e.preventDefault();
                      handleContinueEmail();
                    }
                  }}
                  className="w-full bg-transparent py-3 pr-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* PASSWORD FIELD (Shown when in password step) */}
            {authStep === 'password' && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1.5 pt-1"
              >
                <label 
                  htmlFor="auth-password" 
                  className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 block"
                >
                  PASSWORD
                </label>
                <div className="relative flex items-center bg-white border-b-2 border-slate-300 focus-within:border-slate-700 transition-colors rounded-t-md shadow-2xs">
                  <div className="pl-3.5 pr-2 text-slate-500 shrink-0">
                    <Lock size={18} />
                  </div>
                  <input
                    id="auth-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent py-3 pr-10 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-1 px-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep('email');
                      setPassword('');
                    }}
                    className="text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Change email
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              </motion.div>
            )}

            {/* PRIMARY BUTTON: Continue (step 1) -> Sign In (step 2) - Soft White */}
            <button
              id="auth-submit-btn"
              type="submit"
              className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-extrabold text-sm rounded-full transition-all shadow-xs flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer mt-2"
            >
              {authStep === 'email' ? (
                <>
                  <LogIn size={17} strokeWidth={2.5} />
                  <span>Continue</span>
                </>
              ) : (
                <>
                  <LogIn size={17} strokeWidth={2.5} />
                  <span>{isSignUp ? 'Create account' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          {/* Continue with Google button - Matching Soft White */}
          <div className="w-full">
            <button
              id="google-login-btn"
              type="button"
              onClick={handleGoogleSignInWithConsent}
              className="w-full py-3.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-full font-bold text-sm text-slate-800 flex items-center justify-center gap-2.5 transition-all shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-4 h-4"
              />
              <span>Continue with Google</span>
            </button>
          </div>

          {/* ACCOUNT SWITCHER (Moved below Continue with Google) */}
          <div className="text-center text-xs text-slate-600 pt-0.5">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setAuthStep('email');
                  }}
                  className="text-[#c2410c] font-bold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setAuthStep('email');
                  }}
                  className="text-[#c2410c] font-bold hover:underline cursor-pointer"
                >
                  Create one
                </button>
              </>
            )}
          </div>

          {/* CIRCLE TICK BOX & TERMS/PRIVACY AGREEMENT */}
          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-600">
            <button
              type="button"
              onClick={() => setAgreedToTerms(!agreedToTerms)}
              className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                agreedToTerms 
                  ? 'bg-slate-900 text-white' 
                  : 'border-2 border-slate-400 bg-white'
              }`}
              aria-label="Agree to terms"
            >
              {agreedToTerms && <Check size={11} strokeWidth={3} />}
            </button>
            <span className="text-[12px] text-slate-600 select-none">
              You agree to our{' '}
              <button
                type="button"
                onClick={() => navigateToPublicPage('terms')}
                className="font-semibold text-slate-900 underline hover:text-black cursor-pointer"
              >
                Terms of service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => navigateToPublicPage('privacy')}
                className="font-semibold text-slate-900 underline hover:text-black cursor-pointer"
              >
                Privacy policy
              </button>
            </span>
          </div>
        </div>

        {/* Prominent Footer on homepage/login page */}
        <footer className="w-full max-w-xl border-t border-slate-300/60 mt-10 pt-4 pb-4 text-center text-xs text-slate-500 font-medium">
          <div className="text-[11px] text-slate-400">
            &copy; 2026 DawaLens AI &bull; Smart Medicine Tracker
          </div>
        </footer>

        {/* Global Dialogues & Popups for the Login/Signup Screen */}
        <AnimatePresence>
          {alertMessage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
            >
              <div className="w-full max-w-sm bg-[#faf8f5] border border-[#e3e2e0] rounded-[32px] p-6 text-center shadow-2xl">
                <div className="w-16 h-16 bg-[#0f9d58]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Info className="text-[#0f9d58]" size={32} />
                </div>
                <h3 className="text-xl font-bold text-[#1f1f1f] mb-2">Notice</h3>
                <p className="text-slate-600 text-sm mb-6">{alertMessage}</p>
                <button 
                  onClick={() => setAlertMessage(null)}
                  className="w-full py-3 bg-[#0f9d58] text-white rounded-xl font-bold hover:bg-[#0f9d58]/95 transition-all shadow-sm"
                >
                  OK
                </button>
              </div>
            </motion.div>
          )}

          {passwordResetEmailSent && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
            >
              <div className="w-full max-w-sm bg-white border border-[#e3e2e0] rounded-[32px] p-6 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-[#0f9d58]" />
                
                <div className="w-16 h-16 bg-[#0f9d58]/10 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                  <Mail className="text-[#0f9d58]" size={32} />
                </div>
                
                <h3 className="text-xl font-bold text-[#1f1f1f] mb-2">Check Your Email</h3>
                
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  We've sent a secure link to reset your password to:
                </p>
                
                <div className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 mb-5 inline-block max-w-full">
                  <span className="font-mono text-xs text-slate-800 break-all font-bold select-all">
                    {passwordResetEmailSent}
                  </span>
                </div>
                
                <p className="text-slate-500 text-[13px] leading-relaxed mb-6">
                  Please look for a link sent through your mail. Check your inbox and spam folder to complete resetting your password.
                </p>
                
                <button 
                  onClick={() => setPasswordResetEmailSent(null)}
                  className="w-full py-3 bg-[#0f9d58] text-white rounded-xl font-bold hover:bg-[#0f9d58]/95 transition-all shadow-sm active:scale-[0.98]"
                >
                  Got It, Thanks!
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const handleCloseFooterModal = () => {
    setActiveFooterModal(null);
    if (openedFromSettings) {
      setIsSettingsOpen(true);
      setOpenedFromSettings(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#faf8f5] text-[#1f1f1f] font-sans selection:bg-[#0f9d58] selection:text-white">
      {/* Glossy Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e3e2e0]/80 px-3 py-3 sm:px-4 sm:py-4 shadow-sm">
        <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0f9d58]">
                DawaLens AI
              </h1>
              <p className="text-[#5f6368] text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 sm:mt-1">
                Your Digital Pharmacy
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-[#e3e2e0] hover:border-[#0f9d58] transition-all flex items-center justify-center bg-[#faf8f5] shadow-xs relative group shrink-0"
                title={`Google Account: ${user?.email || ''}`}
              >
                <img 
                  src={user?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120&h=120"} 
                  alt="Profile" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
              </button>
            </div>
          </div>
          
          {/* Search Bar moved to Navbar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 sm:left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0f9d58] transition-colors">
              <Search size={16} className="sm:w-[18px] sm:h-[18px]" />
            </div>
            <input 
              type="text" 
              placeholder="Search medications..."
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#e3e2e0] text-[#1f1f1f] placeholder-slate-400 focus:outline-none focus:border-[#0f9d58] focus:ring-2 focus:ring-[#0f9d58]/10 transition-all rounded-2xl py-2.5 sm:py-3 pl-10 sm:pl-12 pr-10 sm:pr-12 text-xs sm:text-sm shadow-xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 sm:right-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear search"
              >
                <X size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto pt-6 pb-32">
        {/* Pull-To-Refresh Visual Indicator with Mobile Haptics */}
        {(pullDistance > 0 || isPullRefreshing) && (
          <div 
            className="flex items-center justify-center transition-all duration-100 overflow-hidden px-4 mb-3"
            style={{ height: `${Math.max(pullDistance, isPullRefreshing ? 48 : 0)}px`, opacity: Math.min(pullDistance / 40, 1) }}
          >
            <div className="bg-white/95 border border-[#e3e2e0] rounded-full px-4 py-2 shadow-sm flex items-center gap-2 text-slate-700 text-xs font-bold">
              <RefreshCw size={15} className={`text-[#0f9d58] ${pullDistance >= 70 || isPullRefreshing ? 'animate-spin' : ''}`} />
              <span>{isPullRefreshing ? 'Refreshing cabinet...' : pullDistance >= 70 ? 'Release to refresh' : 'Pull down to refresh'}</span>
            </div>
          </div>
        )}

        {/* Stats / Info */}
        <div className="px-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-[#e3e2e0] rounded-2xl p-3.5 shadow-sm">
            <p className="text-slate-500 text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold mb-1">Total</p>
            <p className="text-xl sm:text-2xl font-black text-[#1f1f1f] tracking-tight">{medicines.length}</p>
          </div>
          <div className="bg-white border border-[#e3e2e0] rounded-2xl p-3.5 shadow-sm">
            <p className="text-slate-500 text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold mb-1">Unique</p>
            <p className="text-xl sm:text-2xl font-black text-[#1a73e8] tracking-tight">
              {new Set(medicines.map(m => m.name.toLowerCase().trim())).size}
            </p>
          </div>
          <div className="bg-white border border-[#e3e2e0] rounded-2xl p-3.5 shadow-sm">
            <p className="text-slate-500 text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold mb-1">Expiring</p>
            <p className="text-xl sm:text-2xl font-black text-[#f2a154] tracking-tight">
              {medicines.filter(m => {
                const expiry = new Date(m.expirationDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const [year, month, day] = m.expirationDate.split('-').map(Number);
                if (year && month && day) {
                  expiry.setFullYear(year, month - 1, day);
                }
                expiry.setHours(0, 0, 0, 0);
                
                const diffTime = expiry.getTime() - today.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                const effectiveThreshold = alertThreshold === 90 ? 92 : alertThreshold;
                return diffDays >= 0 && diffDays <= effectiveThreshold;
              }).length}
            </p>
          </div>
          <div className="bg-white border border-[#e3e2e0] rounded-2xl p-3.5 shadow-sm">
            <p className="text-slate-500 text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold mb-1">Taken</p>
            <p className="text-xl sm:text-2xl font-black text-[#0f9d58] tracking-tight">
              {medicines.filter(m => m.taken).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="px-2.5 sm:px-4 mb-6 flex flex-nowrap items-center gap-1 sm:gap-2 relative z-30">
          <button 
            type="button"
            onClick={() => {
              setFilter('all');
              setSelectedCategory('ALL');
            }}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide border transition-all shrink-0 cursor-pointer ${
              filter === 'all' && selectedCategory === 'ALL'
                ? 'bg-[#0f9d58] text-white border-transparent shadow-xs' 
                : 'bg-white hover:bg-slate-50 border-[#e3e2e0] text-slate-600 hover:text-slate-800'
            }`}
          >
            All
          </button>
          <button 
            type="button"
            onClick={() => {
              setFilter(prev => prev === 'expired' ? 'all' : 'expired');
            }}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide border transition-all shrink-0 cursor-pointer ${
              filter === 'expired' 
                ? 'bg-[#ea4335] text-white border-transparent shadow-xs' 
                : 'bg-white hover:bg-slate-50 border-[#e3e2e0] text-slate-600 hover:text-slate-800'
            }`}
          >
            Expired
          </button>
          <button 
            type="button"
            onClick={() => {
              setFilter(prev => prev === 'expiring_soon' ? 'all' : 'expiring_soon');
            }}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide border transition-all shrink-0 cursor-pointer ${
              filter === 'expiring_soon' 
                ? 'bg-[#f2a154] text-white border-transparent shadow-xs' 
                : 'bg-white hover:bg-slate-50 border-[#e3e2e0] text-slate-600 hover:text-slate-800'
            }`}
          >
            Soon
          </button>
          <div className="w-px h-4 sm:h-5 bg-[#e3e2e0] mx-0.5 sm:mx-1 self-center shrink-0"></div>
          <button 
            onClick={() => {
              const nextOrder = sortOrder === 'default' ? 'asc' : sortOrder === 'asc' ? 'desc' : 'default';
              setSortOrder(nextOrder);
              handleUpdateConfig({ sortOrder: nextOrder });
            }}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide border transition-all shrink-0 ${sortOrder !== 'default' ? 'bg-[#0f9d58] text-white border-transparent shadow-xs' : 'bg-white hover:bg-slate-50 border-[#e3e2e0] text-slate-600 hover:text-slate-800'}`}
          >
            {sortOrder === 'desc' ? 'Z-A' : 'A-Z'}
          </button>
          <div className="w-px h-4 sm:h-5 bg-[#e3e2e0] mx-0.5 sm:mx-1 self-center shrink-0"></div>

          {/* Categories Dropdown (Small Size) */}
          <div className="relative inline-block shrink-0" ref={categoryDropdownRef}>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsCategoryDropdownOpen(prev => !prev);
              }}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide border transition-all flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer ${
                selectedCategory !== 'ALL' 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                  : 'bg-white hover:bg-slate-50 border-[#e3e2e0] text-slate-600 hover:text-slate-800'
              }`}
            >
              <span className="truncate max-w-[95px] sm:max-w-none">{selectedCategory !== 'ALL' ? selectedCategory : 'Category'}</span>
              {selectedCategory !== 'ALL' ? (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategory('ALL');
                    setIsCategoryDropdownOpen(false);
                  }}
                  className="hover:text-red-300 transition-colors p-0.5 ml-0.5"
                  title="Clear category filter"
                >
                  <X size={10} className="shrink-0" />
                </span>
              ) : (
                <ChevronDown size={10} className={`transition-transform duration-200 shrink-0 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {isCategoryDropdownOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-48 sm:w-52 max-h-64 overflow-y-auto bg-white border border-[#e3e2e0] rounded-2xl shadow-xl z-50 py-1.5 scrollbar-thin"
              >
                {/* All Option */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-left transition-colors hover:bg-slate-50 ${
                    selectedCategory === 'ALL' ? 'font-bold text-slate-900 bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  <span>All</span>
                  <span className="font-mono text-xs font-bold text-[#0f9d58]">
                    {medicines.filter(m => !m.isDeleted).length}
                  </span>
                </button>

                {/* Categories with Number and Colour (no box or other design) */}
                {categoryDropdownItems.map(({ category, count, accentColor }, cIdx) => {
                  const isSelected = selectedCategory.toLowerCase() === category.toLowerCase();
                  return (
                    <button
                      key={`cat-item-${category}-${cIdx}`}
                      type="button"
                      onClick={() => {
                        const nextCat = isSelected ? 'ALL' : category;
                        setSelectedCategory(nextCat);
                        setIsCategoryDropdownOpen(false);
                        if (nextCat !== 'ALL' && filter !== 'all') {
                          setFilter('all');
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-left transition-colors hover:bg-slate-50 cursor-pointer ${
                        isSelected ? 'font-bold text-slate-900 bg-slate-50' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate pr-2">{category}</span>
                      <span 
                        className="font-mono text-xs font-bold shrink-0" 
                        style={{ color: accentColor }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delete Logo Button (replaces Select Multiple: next to Category on mobile, far right on large screen) */}
          {medicines.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (isSelectionMode) {
                  setIsSelectionMode(false);
                  setSelectedMedicineIds(new Set());
                } else {
                  setIsSelectionMode(true);
                }
              }}
              title={isSelectionMode ? "Cancel Selection" : "Select Multiple to Delete"}
              aria-label={isSelectionMode ? "Cancel Selection" : "Select Multiple to Delete"}
              className="p-1 sm:ml-auto text-red-500 hover:text-red-600 active:scale-90 transition-all shrink-0 flex items-center justify-center cursor-pointer"
            >
              <Trash2 size={16} className={`transition-all ${isSelectionMode ? 'text-red-600 scale-110' : 'text-red-500 hover:text-red-600'}`} />
            </button>
          )}
        </div>

        <MedicineList 
          medicines={filteredMedicines} 
          onEdit={handleEdit} 
          onToggleTaken={handleToggleTaken}
          onReduceQuantity={handleReduceQuantity}
          onDeleteMultiple={handleDeleteMultiple}
          lowQuantityThreshold={lowQuantityThreshold}
          alertThreshold={alertThreshold}
          onToggleLike={handleToggleLike}
          onAutoCategorize={handleAutoCategorize}
          isCategorizing={isCategorizing}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            if (cat !== 'ALL' && filter !== 'all') {
              setFilter('all');
            }
          }}
          isSelectionMode={isSelectionMode}
          setIsSelectionMode={setIsSelectionMode}
          selectedIds={selectedMedicineIds}
          setSelectedIds={setSelectedMedicineIds}
          totalMedicinesCount={medicines.filter(m => !m.isDeleted).length}
        />

        {/* Minimal Footer within main app view */}
        <footer className="mt-12 px-4 pb-24 border-t border-[#e3e2e0]/60 pt-4 text-center text-[11px] text-slate-400 font-bold">
          &copy; 2026 DawaLens AI. All rights reserved.
        </footer>

      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-6 left-0 right-0 z-40 px-6">
        <div className="max-w-[320px] mx-auto bg-white/95 backdrop-blur-md border border-[#e3e2e0] rounded-full p-2 flex items-center justify-between shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
          <button 
            onClick={handleAddManual}
            className="flex-1 py-2 flex flex-col items-center gap-1 transition-all hover:opacity-80"
            style={{ color: 'var(--accent-color)', opacity: 1 }}
          >
            <Plus size={20} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Manual</span>
          </button>
          
          <div className="w-px h-8 bg-slate-200 mx-1"></div>

          <button 
            onClick={() => {
              triggerLightHaptic();
              setIsCameraOpen(true);
            }}
            className="flex-1 py-2 flex flex-col items-center gap-1 transition-all hover:opacity-80"
            style={{ color: 'var(--accent-color)' }}
          >
            <Camera size={20} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Scan</span>
          </button>

          <div className="w-px h-8 bg-slate-200 mx-1"></div>

          <button 
            onClick={() => setIsChatOpen(true)}
            className="flex-1 py-2 flex flex-col items-center gap-1 transition-all hover:opacity-80"
            style={{ color: 'var(--accent-color)' }}
          >
            <DoctorLogo className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Consult</span>
          </button>
        </div>
      </div>

      {/* Modals & Three-Page System */}
      <AnimatePresence>
        {activeSystemPage === 'details' && currentDetailsMedicine && (
          <MedicineDetailsPage
            medicine={currentDetailsMedicine}
            allMedicines={medicines}
            globalLowQuantityThreshold={lowQuantityThreshold}
            alertThreshold={alertThreshold}
            onBack={() => {
              setActiveSystemPage(null);
              setSelectedDetailsMedicine(null);
            }}
            onGoToHistory={() => setActiveSystemPage('history')}
            onGoToEdit={() => setActiveSystemPage('edit')}
          />
        )}

        {activeSystemPage === 'history' && currentDetailsMedicine && (
          <MedicineHistoryPage
            medicine={currentDetailsMedicine}
            onBack={() => setActiveSystemPage('details')}
          />
        )}

        {activeSystemPage === 'edit' && currentDetailsMedicine && (
          <MedicineEditPage
            medicine={currentDetailsMedicine}
            allMedicines={medicines}
            globalLowQuantityThreshold={lowQuantityThreshold}
            isSaving={isSaving}
            onSave={handleSaveFromEditPage}
            onBack={() => setActiveSystemPage('details')}
          />
        )}

        {activeSystemPage === 'add' && (
          <MedicineAddPage
            initialData={editingMedicine}
            extractionWarning={extractionWarning}
            allMedicines={medicines}
            globalLowQuantityThreshold={lowQuantityThreshold}
            isSaving={isSaving}
            onSave={handleSave}
            onBack={() => {
              setActiveSystemPage(null);
              setEditingMedicine(null);
              setExtractionWarning(null);
            }}
          />
        )}

        {isCameraOpen && (
          <CameraCapture 
            onCapture={handleCapture}
            onClose={() => {
              setIsCameraOpen(false);
              setExtractionError(null);
            }}
            isProcessing={isProcessing}
            extractionError={extractionError}
          />
        )}

        {isChatOpen && (
          <ChatView 
            medicines={medicines}
            onClose={() => setIsChatOpen(false)}
            user={user}
            userPhoto={user?.photoURL}
          />
        )}

        {isSettingsOpen && (
          <SettingsModal 
            onClose={() => setIsSettingsOpen(false)}
            onClearData={confirmClearData}
            alertThreshold={alertThreshold}
            setAlertThreshold={(val) => handleUpdateConfig({ alertThreshold: val })}
            lowQuantityThreshold={lowQuantityThreshold}
            setLowQuantityThreshold={(val) => handleUpdateConfig({ lowQuantityThreshold: val })}
            accentColor={accentColor}
            setAccentColor={(val) => handleUpdateConfig({ accentColor: val })}
            emailNotificationsEnabled={emailNotificationsEnabled}
            setEmailNotificationsEnabled={(val) => handleUpdateConfig({ emailNotificationsEnabled: val })}
            browserNotificationsEnabled={browserNotificationsEnabled}
            setBrowserNotificationsEnabled={async (val) => {
              setBrowserNotificationsEnabled(val);
              handleUpdateConfig({ browserNotificationsEnabled: val });

              if (val) {
                if (Capacitor.isNativePlatform()) {
                  scheduleNativeMedicineAlerts(medicines, alertThreshold).catch(() => {});
                } else {
                  checkAndTriggerBrowserExpiryNotifications(medicines, alertThreshold).catch(() => {});
                  if (user?.uid) {
                    registerBrowserPushTokenWithServer(user.uid, `web_${user.uid}`).catch(() => {});
                  }
                }
              }
            }}
            onTestNotification={async () => {
              if (Capacitor.isNativePlatform()) {
                try {
                  await LocalNotifications.schedule({
                    notifications: [
                      {
                        title: '🚨 DawaLens AI Test Alert',
                        body: 'Native Android notifications are active! You will receive automated medicine alerts.',
                        id: Math.floor(Math.random() * 1000000) + 1,
                        schedule: { at: new Date(Date.now() + 100) },
                        channelId: 'medicine_alerts',
                        smallIcon: 'ic_launcher'
                      }
                    ]
                  });
                } catch (e) {
                  console.warn('Native test notification error:', e);
                }
                if (user?.uid) {
                  fetch(getApiUrl('/api/notifications/send-test'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: user.uid,
                      title: '🚨 DawaLens AI Server Alert',
                      body: 'Native push notification reached your device successfully!'
                    })
                  }).catch(() => {});
                }
                return;
              }

              if (!isBrowserNotificationSupported()) {
                setAlertMessage('Notifications are not supported in this browser.');
                return;
              }
              if (Notification.permission !== 'granted') {
                const granted = await requestBrowserNotificationPermission();
                if (!granted) {
                  setAlertMessage('Notification permission not granted. Please allow notifications in Chrome.');
                  return;
                }
              }
              const success = await showBrowserNotification('🚨 DawaLens AI Test Alert', {
                body: 'Chrome notifications are active and working! You will receive automated medicine expiry alerts.',
                tag: 'dawalens-test-direct'
              });
              if (!success) {
                setAlertMessage('Could not display notification. Please check browser permission settings.');
              }
              if (user?.uid) {
                fetch(getApiUrl('/api/notifications/send-test'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: user.uid,
                    title: '🚨 DawaLens AI Server Alert',
                    body: 'Server push notification reached your browser successfully!'
                  })
                }).catch(() => {});
              }
            }}
            photoURL={user?.photoURL || undefined}
            userEmail={user.email || ''}
            onLogout={handleLogout}
            medicines={medicines}
            deletedMedicines={deletedMedicines}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            // Integrations
            onImportCSV={handleImport}
            onExportCSV={exportToSheets}
            onOpenMailbox={() => setIsMailboxOpen(true)}
            // Screenshot navigation matching
            onResetToHome={() => { setFilter('all'); setSearchQuery(''); setIsLikedOnly(false); }}
            onToggleLikedOnly={() => setIsLikedOnly(!isLikedOnly)}
            isLikedOnly={isLikedOnly}
            onOpenGuide={() => { triggerLightHaptic(); setOpenedFromSettings(true); setIsSettingsOpen(false); navigateToPublicPage('guide'); }}
            onOpenPrivacy={() => { triggerLightHaptic(); setOpenedFromSettings(true); setIsSettingsOpen(false); navigateToPublicPage('privacy'); }}
            onOpenTerms={() => { triggerLightHaptic(); setOpenedFromSettings(true); setIsSettingsOpen(false); navigateToPublicPage('terms'); }}
            onOpenDeleteAccount={() => { triggerLightHaptic(); setOpenedFromSettings(true); setIsSettingsOpen(false); navigateToPublicPage('delete-account'); }}
          />
        )}

        {isMailboxOpen && (
          <MailboxModal 
            onClose={() => {
              setIsMailboxOpen(false);
              setIsSettingsOpen(true);
            }}
            user={user}
            medicines={medicines}
          />
        )}

        {isInteractionModalOpen && interactionResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm overflow-y-auto"
          >
            <div className="w-full max-w-lg bg-[#faf8f5] border border-[#e3e2e0] rounded-[32px] p-8 shadow-2xl my-auto">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                    <ShieldAlert className="text-[#0f9d58]" size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-[#1f1f1f] tracking-tight">Safety Analysis</h3>
                </div>
                <button 
                  onClick={() => setIsInteractionModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-800 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-[#e3e2e0] rounded-2xl p-4">
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Our AI has analyzed your current medications for potential interactions. 
                    <span className="block mt-2 text-[10px] uppercase tracking-widest font-bold text-slate-400">Disclaimer: This is for informational purposes only. Always consult a doctor.</span>
                  </p>
                </div>

                {interactionResult.interactions.length > 0 ? (
                  <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {interactionResult.interactions.map((interaction, idx) => (
                      <div key={`interaction-${idx}`} className="bg-white border border-[#e3e2e0]/60 rounded-2xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-[#1f1f1f] font-semibold text-sm">{interaction.medications.join(' + ')}</h4>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            interaction.severity === 'high' ? 'bg-red-50 text-red-700' :
                            interaction.severity === 'moderate' ? 'bg-orange-50 text-orange-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {interaction.severity}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed">{interaction.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="text-emerald-600" size={32} />
                    </div>
                    <p className="text-[#1f1f1f] font-medium">No significant interactions found</p>
                    <p className="text-slate-400 text-xs mt-1">Based on your current medication list.</p>
                  </div>
                )}

                <div className="pt-2 border-t border-[#e3e2e0]">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3">General Advice</h4>
                  <p className="text-slate-500 text-xs leading-relaxed italic">
                    {interactionResult.generalAdvice}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsInteractionModalOpen(false)}
                className="w-full mt-8 py-4 bg-[#0f9d58] text-white rounded-full font-bold hover:bg-[#0f9d58]/95 transition-all shadow-sm"
              >
                Close Analysis
              </button>
            </div>
          </motion.div>
        )}

        {alertMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          >
            <div className="w-full max-w-sm bg-[#faf8f5] border border-[#e3e2e0] rounded-[32px] p-6 text-center shadow-2xl">
              <div className="w-16 h-16 bg-[#0f9d58]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="text-[#0f9d58]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1f1f1f] mb-2">Notice</h3>
              <p className="text-slate-600 text-sm mb-6">{alertMessage}</p>
              <button 
                onClick={() => setAlertMessage(null)}
                className="w-full py-3 bg-[#0f9d58] text-white rounded-xl font-bold hover:bg-[#0f9d58]/95 transition-all shadow-sm"
              >
                OK
              </button>
            </div>
          </motion.div>
        )}

        {passwordResetEmailSent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          >
            <div className="w-full max-w-sm bg-white border border-[#e3e2e0] rounded-[32px] p-6 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#0f9d58]" />
              
              <div className="w-16 h-16 bg-[#0f9d58]/10 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                <Mail className="text-[#0f9d58]" size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-[#1f1f1f] mb-2">Check Your Email</h3>
              
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                We've sent a secure link to reset your password to:
              </p>
              
              <div className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 mb-5 inline-block max-w-full">
                <span className="font-mono text-xs text-slate-800 break-all font-bold select-all">
                  {passwordResetEmailSent}
                </span>
              </div>
              
              <p className="text-slate-500 text-[13px] leading-relaxed mb-6">
                Please look for a link sent through your mail. Check your inbox and spam folder to complete resetting your password.
              </p>
              
              <button 
                onClick={() => setPasswordResetEmailSent(null)}
                className="w-full py-3 bg-[#0f9d58] text-white rounded-xl font-bold hover:bg-[#0f9d58]/95 transition-all shadow-sm active:scale-[0.98]"
              >
                Got It, Thanks!
              </button>
            </div>
          </motion.div>
        )}

        {activeFooterModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm overflow-y-auto"
            onClick={handleCloseFooterModal}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white border border-[#e3e2e0] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#e3e2e0]/60 flex items-center justify-between bg-[#faf8f5]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#0f9d58]/10 rounded-lg flex items-center justify-center text-[#0f9d58]">
                    <Pill size={16} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#1f1f1f] tracking-tight text-sm sm:text-base">
                      {activeFooterModal === 'guide' ? 'User Guide & Manual' : 
                       activeFooterModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                    </h3>
                  </div>
                </div>
                <button 
                  onClick={handleCloseFooterModal}
                  className="p-1.5 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-slate-600 text-sm leading-relaxed custom-scrollbar">
                {activeFooterModal === 'guide' && (
                  <>
                    {/* Header Image */}
                    <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 relative h-40 sm:h-44 shrink-0 shadow-xs">
                      <img 
                        src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600&h=300" 
                        alt="Medication Tracker" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <span className="text-[9px] font-bold uppercase tracking-widest bg-[#0f9d58] px-2.5 py-0.5 rounded-full mb-1.5 inline-block">App Manual</span>
                        <h4 className="text-base sm:text-lg font-black leading-tight tracking-tight">Master Your Cabinet with DawaLens AI</h4>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-slate-500 font-medium text-xs leading-relaxed">
                        Welcome to your digital medication assistant. DawaLens AI helps you safely catalog, scan, track, and analyze your daily medicine schedules using advanced AI technology.
                      </p>

                      <div className="space-y-3 pt-1">
                        {/* Step 1 */}
                        <div className="flex gap-3 items-start bg-[#faf8f5] p-3.5 rounded-2xl border border-slate-100">
                          <div className="w-8 h-8 bg-[#0f9d58]/10 text-[#0f9d58] rounded-xl flex items-center justify-center font-black shrink-0 text-sm">
                            1
                          </div>
                          <div className="space-y-0.5">
                            <h5 className="font-extrabold text-[#1f1f1f] text-xs uppercase tracking-wider">Scan Prescriptions 📸</h5>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Tap <strong className="text-slate-700">Scan</strong> in the floating bar at the bottom. Position any medication bottle, pill blister, or prescription sheet inside the camera guide. Our built-in Gemini AI will instantly identify the drug name, dosage frequencies, inventory count, and expiration date.
                            </p>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex gap-3 items-start bg-[#faf8f5] p-3.5 rounded-2xl border border-slate-100">
                          <div className="w-8 h-8 bg-[#0f9d58]/10 text-[#0f9d58] rounded-xl flex items-center justify-center font-black shrink-0 text-sm">
                            2
                          </div>
                          <div className="space-y-0.5">
                            <h5 className="font-extrabold text-[#1f1f1f] text-xs uppercase tracking-wider">Add Medicines Manually ✍️</h5>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Prefer entering details by hand? Tap <strong className="text-slate-700">Manual</strong> to trigger the complete medication form. You can select custom medicine types, color accents, current quantity, threshold triggers, and details on daily schedule reminders.
                            </p>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex gap-3 items-start bg-[#faf8f5] p-3.5 rounded-2xl border border-slate-100">
                          <div className="w-8 h-8 bg-[#0f9d58]/10 text-[#0f9d58] rounded-xl flex items-center justify-center font-black shrink-0 text-sm">
                            3
                          </div>
                          <div className="space-y-0.5">
                            <h5 className="font-extrabold text-[#1f1f1f] text-xs uppercase tracking-wider">Track Intake & Stock Deductions ✅</h5>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              On the main dashboard, simply tap the checkbox next to any medicine to record your dosage. The app automatically subtracts the correct volume or pill count from your active stock and logs the date and time.
                            </p>
                          </div>
                        </div>

                        {/* Step 4 */}
                        <div className="flex gap-3 items-start bg-[#faf8f5] p-3.5 rounded-2xl border border-slate-100">
                          <div className="w-8 h-8 bg-[#0f9d58]/10 text-[#0f9d58] rounded-xl flex items-center justify-center font-black shrink-0 text-sm">
                            4
                          </div>
                          <div className="space-y-0.5">
                            <h5 className="font-extrabold text-[#1f1f1f] text-xs uppercase tracking-wider">AI Interaction Analysis 🛡️</h5>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Concerned about combination safety? The system automatically parses your medication list to check for potential severe or moderate drug interactions. Look at the real-time health insights right on your dashboard!
                            </p>
                          </div>
                        </div>

                        {/* Step 5 */}
                        <div className="flex gap-3 items-start bg-[#faf8f5] p-3.5 rounded-2xl border border-slate-100">
                          <div className="w-8 h-8 bg-[#0f9d58]/10 text-[#0f9d58] rounded-xl flex items-center justify-center font-black shrink-0 text-sm">
                            5
                          </div>
                          <div className="space-y-0.5">
                            <h5 className="font-extrabold text-[#1f1f1f] text-xs uppercase tracking-wider">Alerts & Configuration 🔔</h5>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Go to Settings to set custom alert thresholds (e.g. alert 15 or 30 days before expiration), low inventory warnings, and sync options. Enable browser or email notifications to stay fully on top of your daily schedule.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeFooterModal === 'privacy' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex gap-3 items-start mb-4">
                      <Shield className="text-[#0f9d58] shrink-0 mt-0.5" size={18} />
                      <div>
                        <h4 className="font-extrabold text-[#1f1f1f] text-xs uppercase tracking-wider mb-1">Google OAuth &amp; Data Safety Compliance</h4>
                        <p className="text-xs text-emerald-850/80 leading-relaxed font-semibold">
                          DawaLens AI is dedicated to protecting your personal information and health privacy. This policy applies to our application hosted at dawalens.vercel.app and dawalensai.onrender.com.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed space-y-1">
                      <strong className="block text-blue-950 font-bold uppercase text-[10px]">Google API Limited Use Disclosure:</strong>
                      <p>
                        DawaLens AI&apos;s use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements. We never sell your Google data or use it for advertising or foundation AI model training.
                      </p>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div>
                        <h5 className="font-extrabold text-slate-800 text-[13px] uppercase tracking-wider mb-1">1. Information Access &amp; Camera Image Security</h5>
                        <ul className="list-disc pl-5 mt-2 space-y-2 text-slate-500 leading-relaxed">
                          <li>
                            <strong className="text-slate-700 font-bold">Medications &amp; Schedules:</strong> Medicine details (brand/generic names, dosages, expiration dates, schedules) are saved securely in your private cloud database (Firebase Firestore) with AES-256 encryption at rest.
                          </li>
                          <li>
                            <strong className="text-slate-700 font-bold">Label Extraction &amp; Photos:</strong> During camera scanning, packaging photos are transmitted over encrypted HTTPS to Google Gemini for label character extraction (ephemeral memory processing). Saved medicine photos in your vault are stored locally in on-device IndexedDB memory and are never stored in cloud database disks.
                          </li>
                          <li>
                            <strong className="text-slate-700 font-bold">Offline Reference Engine:</strong> Our on-device assistant runs a rule-based clinical formulary and heuristic packaging classifier with zero external network transmission.
                          </li>
                          <li>
                            <strong className="text-slate-700 font-bold">Data Deletion:</strong> You can permanently purge your entire account and all records anytime via Account Settings or our web deletion portal.
                          </li>
                        </ul>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Contact &amp; Data Protection</h5>
                          <p className="text-slate-500 text-xs">Email: <span className="font-bold text-slate-800">[TODO_USER_INPUT: CONTACT_EMAIL (e.g. support@dawalens.in)]</span></p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFooterModal(null);
                            navigateToPublicPage('privacy');
                          }}
                          className="px-3 py-1.5 bg-[#0f9d58] text-white rounded-lg text-xs font-bold hover:bg-[#0b8043] transition-colors cursor-pointer"
                        >
                          View Full Privacy Policy
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeFooterModal === 'terms' && (
                  <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex gap-3 items-start mb-4">
                      <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={18} />
                      <div>
                        <h4 className="font-extrabold text-red-800 text-xs uppercase tracking-wider mb-1">Medical Disclaimer</h4>
                        <p className="text-xs text-red-700/95 leading-relaxed font-bold">
                          DawaLens AI is an informational tool and medication tracker. It is NOT a clinical tool, medical device, or licensed healthcare professional. Never change, delay, or start medical treatment without directly consulting your doctor or pharmacist.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div>
                        <h5 className="font-extrabold text-slate-800 text-[13px] uppercase tracking-wider mb-1">1. Description of Service</h5>
                        <p className="text-slate-500 leading-relaxed">
                          DawaLens AI provides medication packaging scanning, expiry tracking, and drug-interaction screening using AI and rule-based pharmacology references. These features are designed strictly for educational and personal organization purposes.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <h5 className="font-extrabold text-slate-800 text-[13px] uppercase tracking-wider mb-1">2. Privacy, Photos &amp; Personal Data</h5>
                        <p className="text-slate-500 leading-relaxed">
                          We respect your privacy. Packaging images in your vault are kept locally on your physical device (IndexedDB storage). All handling of user data adheres to our Privacy Policy.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <h5 className="font-extrabold text-slate-800 text-[13px] uppercase tracking-wider mb-1">3. Limitation of Liability</h5>
                        <p className="text-slate-500 leading-relaxed">
                          DawaLens AI is provided &quot;as is&quot; without warranties. We are not liable for missed doses, sync failures, or information inaccuracies.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <h5 className="font-extrabold text-slate-800 text-[13px] uppercase tracking-wider mb-1">4. Governing Law &amp; Contact</h5>
                        <p className="text-slate-500 leading-relaxed">
                          Operator: <strong>[TODO_USER_INPUT: OPERATOR_LEGAL_NAME (e.g. DawaLens Technologies Private Limited)]</strong>
                        </p>
                        <p className="font-bold text-slate-800 mt-1 select-all">
                          Contact Email: [TODO_USER_INPUT: CONTACT_EMAIL (e.g. support@dawalens.in)]
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-[#e3e2e0]/60 bg-[#faf8f5] flex justify-end shrink-0">
                <button 
                  onClick={handleCloseFooterModal}
                  className="px-6 py-2.5 bg-[#0f9d58] hover:bg-[#0f9d58]/95 text-white rounded-full font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Mandatory First-Launch Medical & Safety Disclaimer Modal */}
        {!hasAcceptedMedicalDisclaimer && publicPage === null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="w-full max-w-lg bg-white border border-[#e3e2e0] rounded-[32px] shadow-2xl overflow-hidden flex flex-col my-auto"
            >
              <div className="px-6 py-5 bg-gradient-to-r from-red-50 via-amber-50 to-emerald-50 border-b border-amber-200/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
                  <ShieldAlert size={22} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base tracking-tight">
                    Important Medical &amp; Safety Notice
                  </h3>
                  <p className="text-[11px] text-amber-900 font-bold uppercase tracking-wider">
                    Please read and acknowledge before proceeding
                  </p>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed custom-scrollbar">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-900 space-y-1.5">
                  <strong className="block text-xs font-black uppercase tracking-wider text-red-950">
                    ⚠️ Not a Licensed Doctor or Medical Device:
                  </strong>
                  <p className="text-xs leading-relaxed text-red-900 font-medium">
                    DawaLens AI is an organizational medicine tracker and clinical reference engine. It is <strong>NOT</strong> a certified medical device, diagnostic platform, or licensed physician.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">1</span>
                    <p className="text-xs text-slate-600">
                      <strong className="text-slate-800">Informational Use Only:</strong> AI summaries, label recognitions, dose tracking, and drug-interaction screenings are automated reference points. They do not constitute clinical diagnoses or prescriptions.
                    </p>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">2</span>
                    <p className="text-xs text-slate-600">
                      <strong className="text-slate-800">Always Consult a Doctor:</strong> Never start, pause, stop, or change any prescription or medication dosage without directly consulting your primary physician or pharmacist.
                    </p>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">3</span>
                    <p className="text-xs text-slate-600">
                      <strong className="text-slate-800">Emergency Protocol:</strong> If you suspect an adverse reaction, allergic shock, or acute medical emergency, call your local emergency services (<strong>112 / 108 / 911</strong>) immediately.
                    </p>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">4</span>
                    <p className="text-xs text-slate-600">
                      <strong className="text-slate-800">Data Sources:</strong> Drug reference knowledge is compiled from official pharmacopeias including the Indian Pharmacopoeia (IP), CDSCO, and US FDA drug databases.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <label className="flex items-start gap-3 cursor-pointer bg-slate-50 hover:bg-slate-100 p-3.5 rounded-2xl border border-slate-200 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={disclaimerCheckConsent} 
                      onChange={(e) => setDisclaimerCheckConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#0f9d58] focus:ring-[#0f9d58] shrink-0" 
                    />
                    <span className="text-xs text-slate-800 font-semibold leading-relaxed">
                      I have read, understood, and agree that DawaLens AI is an informational tool and does not provide medical diagnoses or replace licensed doctor consultations.
                    </span>
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-[#faf8f5] flex items-center justify-end">
                <button
                  disabled={!disclaimerCheckConsent}
                  onClick={() => {
                    try {
                      localStorage.setItem('dawalens_medical_disclaimer_acknowledged', 'true');
                    } catch (e) {
                      console.warn('Could not persist disclaimer acknowledgment:', e);
                    }
                    setHasAcceptedMedicalDisclaimer(true);
                    triggerSuccessHaptic();
                  }}
                  className="w-full py-3.5 bg-[#0f9d58] hover:bg-[#0b8043] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-[0.98]"
                >
                  I Understand &amp; Acknowledge
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
