import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { recordCrash } from '../services/crashReportingService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    recordCrash(error, 'ReactErrorBoundary: ' + (errorInfo.componentStack || ''));
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleHardReset = () => {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (let reg of registrations) reg.unregister();
        });
      }
      if ('caches' in window) {
        caches.keys().then(keys => {
          keys.forEach(k => caches.delete(k));
        });
      }
    } catch (e) {}
    setTimeout(() => {
      window.location.href = window.location.origin + '/?reset=' + Date.now();
    }, 200);
  };

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong. Please try again.";
      let technicalDetails = this.state.error?.message || "";
      
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.operationType) {
            errorMessage = `Database error during ${parsed.operationType}. You might not have permission to perform this action.`;
          }
        }
      } catch (e) {}

      return (
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-6 text-[#1f1f1f] font-sans">
          <div className="max-w-md w-full bg-white border border-[#e3e2e0] rounded-3xl p-8 text-center space-y-6 shadow-xl">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Application Error</h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                {errorMessage}
              </p>
              {technicalDetails && (
                <p className="text-xs text-red-500 font-mono bg-red-50 p-2.5 rounded-xl border border-red-100 break-all text-left max-h-28 overflow-y-auto">
                  {technicalDetails}
                </p>
              )}
            </div>
            <div className="space-y-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-3.5 bg-[#0f9d58] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#0b7a44] transition-all cursor-pointer"
              >
                <RefreshCw size={18} />
                Reload Application
              </button>
              <button
                onClick={this.handleHardReset}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-semibold text-xs transition-all cursor-pointer"
              >
                Clear Stale Cache & Refresh
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
