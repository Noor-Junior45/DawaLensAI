import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initCrashReporting } from './services/crashReportingService';
import './index.css';

// Initialize Crash Protection & Crashlytics
initCrashReporting();

// On native Android/iOS, ensure native splash screen is dismissed promptly
if (Capacitor.isNativePlatform()) {
  setTimeout(() => {
    SplashScreen.hide().catch(() => {});
  }, 100);
}

// Register PWA Service Worker only on Web browsers (avoid caching conflicts in Native Android WebView)
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('PWA Service Worker registered successfully:', reg.scope);
        // Explicitly check for updates on page reload to avoid stale content
        reg.update();
      })
      .catch((err) => {
        console.warn('PWA Service Worker registration warning (expected in sandboxed frames):', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
