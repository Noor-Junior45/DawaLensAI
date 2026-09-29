import { Capacitor } from '@capacitor/core';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

let isCrashlyticsInitialized = false;

/**
 * Initializes Crashlytics on native Android/iOS and sets up global error shields
 * to prevent uncaught exceptions from crashing or freezing the app.
 */
export async function initCrashReporting(): Promise<void> {
  if (isCrashlyticsInitialized) return;
  isCrashlyticsInitialized = true;

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    try {
      await FirebaseCrashlytics.setEnabled({ enabled: true });
      await FirebaseCrashlytics.sendUnsentReports();
      console.log('Firebase Crashlytics active on native device');
    } catch (e) {
      console.warn('Firebase Crashlytics init warning:', e);
    }
  }

  // Global uncaught error listener to safeguard against sudden crashes
  window.addEventListener('error', (event) => {
    try {
      const errorMessage = event.message || 'Unknown global error';
      console.error('[Global Error Caught]:', errorMessage, event.error);

      if (isNative) {
        FirebaseCrashlytics.recordException({
          message: `UncaughtError: ${errorMessage} at ${event.filename}:${event.lineno}:${event.colno}`,
        }).catch(() => {});
      }
    } catch {
      // Never allow error reporting itself to fail or crash
    }
  });

  // Global unhandled promise rejection listener
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason;
      const errorMsg = reason instanceof Error ? reason.message : String(reason);
      console.warn('[Unhandled Rejection Shielded]:', errorMsg);

      if (isNative) {
        FirebaseCrashlytics.recordException({
          message: `UnhandledRejection: ${errorMsg}`,
        }).catch(() => {});
      }
    } catch {
      // Safeguard
    }
  });
}

/**
 * Associates user session with crash telemetry for diagnostics.
 */
export async function setCrashReportingUser(userId: string | null): Promise<void> {
  if (!Capacitor.isNativePlatform() || !userId) return;
  try {
    await FirebaseCrashlytics.setUserId({ userId });
  } catch (e) {
    // Non-fatal
  }
}

/**
 * Records non-fatal errors with optional diagnostic context.
 */
export async function recordCrash(error: any, context?: string): Promise<void> {
  const message = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack || ''}` : String(error);
  const fullMessage = context ? `[${context}] ${message}` : message;

  console.error('[Error Recorded]:', fullMessage);

  if (Capacitor.isNativePlatform()) {
    try {
      if (context) {
        await FirebaseCrashlytics.setCustomKey({
          key: 'error_context',
          value: context,
          type: 'string',
        });
      }
      await FirebaseCrashlytics.recordException({ message: fullMessage });
    } catch {
      // Fallback
    }
  }
}

/**
 * Adds breadcrumbs to Crashlytics session.
 */
export async function logCrashBreadcrumb(message: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await FirebaseCrashlytics.log({ message });
  } catch {
    // Fallback
  }
}
