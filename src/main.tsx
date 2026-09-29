import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initCrashReporting } from './services/crashReportingService';
import './index.css';

// Initialize Crash Protection & Crashlytics
initCrashReporting();

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
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
