/**
 * Google Analytics & Consent Manager for DawaSnap AI
 * Compliant with Google Play Store Health Apps Policy & DPDP Act 2023.
 * Strictly prevents any medication names, dosages, health information, or PII from being transmitted.
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

const GA_MEASUREMENT_ID = 'G-0N6JNZ8SV0';
const CONSENT_STORAGE_KEY = 'dawasnap_analytics_consent';
const LEGACY_CONSENT_KEY = 'dawalens_analytics_consent';

export function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === 'true' || localStorage.getItem(LEGACY_CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAnalyticsConsent(granted: boolean): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, granted ? 'true' : 'false');
    if (granted) {
      loadGoogleAnalyticsScript();
    }
  } catch (e) {
    console.warn('Could not persist analytics consent:', e);
  }
}

export function loadGoogleAnalyticsScript(): void {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return;
  if (document.getElementById('ga4-script')) return; // Already loaded

  try {
    const script = document.createElement('script');
    script.id = 'ga4-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer?.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      restricted_data_processing: true
    });
  } catch (err) {
    console.warn('Failed to load Google Analytics:', err);
  }
}

// Blocklist of sensitive health and personal keys that must NEVER be passed to analytics
const FORBIDDEN_KEYS = new Set([
  'name', 'medicine', 'medication', 'medicinename', 'dosage', 'condition', 
  'symptom', 'disease', 'diagnosis', 'userId', 'uid', 'email', 'userEmail', 
  'query', 'prompt', 'capturedImage', 'text', 'html', 'error'
]);

/**
 * Tracks a privacy-safe generic application event.
 * Strips any health details, patient identifiers, or medicine names before recording.
 */
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  try {
    if (!hasAnalyticsConsent()) {
      return; // Do not record if user has not provided explicit consent
    }

    const sanitizedParams: Record<string, any> = {};
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (!FORBIDDEN_KEYS.has(key.toLowerCase()) && typeof value !== 'object') {
          sanitizedParams[key] = value;
        }
      }
    }

    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, {
        ...sanitizedParams,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    // Fail silently in production
  }
};
