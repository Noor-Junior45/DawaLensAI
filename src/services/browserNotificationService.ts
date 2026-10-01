import { Medicine } from '../types';

/**
 * Service to manage Chrome and browser native desktop/mobile notifications for medication expiries.
 */

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests permission from the user in Chrome / Browser.
 * Resolves to true if granted, false otherwise.
 */
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!isBrowserNotificationSupported()) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Show an immediate confirmation notification so the user knows it's working
      await showBrowserNotification('✅ Expiry Notifications Enabled', {
        body: 'DawaLens AI will alert you when your medicines are nearing expiration or need refills.',
        tag: 'dawalens-welcome'
      });
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Failed to request browser notification permission:', error);
    return false;
  }
}

interface NotificationOptionsExtended extends NotificationOptions {
  url?: string;
}

/**
 * Displays a Chrome/browser notification using ServiceWorker if ready, or direct Notification API.
 */
export async function showBrowserNotification(
  title: string,
  options: NotificationOptionsExtended = {}
): Promise<boolean> {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const defaultOptions: any = {
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    ...options
  };

  try {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, defaultOptions);
          return true;
        }
      } catch {
        // Fall back to direct constructor below
      }
    }

    new Notification(title, defaultOptions);
    return true;
  } catch (error) {
    console.warn('Error showing browser notification:', error);
    return false;
  }
}

/**
 * Analyzes the user's active medicines and triggers Chrome notifications for:
 * 1. Expired medicines (Alert: Do not consume)
 * 2. Medicines expiring within 7 days (Urgent refill notice)
 * 3. Medicines expiring within 30 days (Advance reminder)
 */
export async function checkAndTriggerBrowserExpiryNotifications(
  medicines: Medicine[],
  alertThreshold: number = 90
): Promise<{ expiredCount: number; expiringSoonCount: number }> {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return { expiredCount: 0, expiringSoonCount: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const expiredList: Medicine[] = [];
  const urgent7DaysList: Medicine[] = [];
  const notice30DaysList: Medicine[] = [];

  for (const m of medicines) {
    if (m.isDeleted || m.taken || !m.expirationDate) {
      continue;
    }

    const [year, month, day] = m.expirationDate.split('-').map(Number);
    if (!year || !month || !day) continue;

    const expiry = new Date(year, month - 1, day);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      expiredList.push(m);
    } else if (diffDays <= 7) {
      urgent7DaysList.push(m);
    } else if (diffDays <= 30) {
      notice30DaysList.push(m);
    }
  }

  // Deduplication key per date to avoid repeating same notifications every minute
  const cacheKey = `dawalens_notified_${todayStr}`;
  let alreadyNotifiedToday = false;
  try {
    alreadyNotifiedToday = localStorage.getItem(cacheKey) === 'true';
  } catch {
    // Ignore storage issues
  }

  if (alreadyNotifiedToday) {
    return { 
      expiredCount: expiredList.length, 
      expiringSoonCount: urgent7DaysList.length + notice30DaysList.length 
    };
  }

  // 1. Expired Notification
  if (expiredList.length > 0) {
    const names = expiredList.slice(0, 3).map(m => m.name).join(', ') + (expiredList.length > 3 ? ` +${expiredList.length - 3} more` : '');
    await showBrowserNotification('🚨 Medicine Expired Alert', {
      body: `${expiredList.length} medication(s) have expired: ${names}. Please dispose of them safely.`,
      tag: 'dawalens-expired',
      requireInteraction: true
    });
  }

  // 2. Urgent 7-day Notification
  if (urgent7DaysList.length > 0) {
    const names = urgent7DaysList.slice(0, 3).map(m => m.name).join(', ') + (urgent7DaysList.length > 3 ? ` +${urgent7DaysList.length - 3} more` : '');
    await showBrowserNotification('⚠️ Refill Warning: Expiring in 7 Days', {
      body: `${urgent7DaysList.length} medicine(s) expire this week: ${names}. Check pharmacy refills soon.`,
      tag: 'dawalens-7days'
    });
  } else if (notice30DaysList.length > 0) {
    // 3. 30-day notice if no 7-day urgent alert
    const names = notice30DaysList.slice(0, 3).map(m => m.name).join(', ') + (notice30DaysList.length > 3 ? ` +${notice30DaysList.length - 3} more` : '');
    await showBrowserNotification('📅 Expiry Notice: Expiring This Month', {
      body: `${notice30DaysList.length} medicine(s) expire in 1 month: ${names}.`,
      tag: 'dawalens-30days'
    });
  }

  try {
    localStorage.setItem(cacheKey, 'true');
  } catch {
    // Ignore
  }

  return {
    expiredCount: expiredList.length,
    expiringSoonCount: urgent7DaysList.length + notice30DaysList.length
  };
}

/**
 * Registers user's browser push token with the backend server so the server
 * background cron can send automated notifications to Chrome.
 */
export async function registerBrowserPushTokenWithServer(userId: string, token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        token,
        platform: 'web',
        userAgent: navigator.userAgent
      })
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not register push token with server:', e);
    return false;
  }
}
