import { Capacitor } from '@capacitor/core';
import { LocalNotifications, Channel, LocalNotificationSchema } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Medicine } from '../types';

/**
 * Generates a stable positive 32-bit integer ID for LocalNotifications from string key
 */
function generateNotificationId(uniqueKey: string): number {
  let hash = 0;
  for (let i = 0; i < uniqueKey.length; i++) {
    const char = uniqueKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash % 2147483640) + 1;
}

/**
 * Explicitly requests native Android push notification permissions using the Capacitor Push Notifications API.
 * Prompts the native Android POST_NOTIFICATIONS permission dialog and registers device with FCM.
 */
export async function requestNativePushPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    // 1. Explicitly check and request native push permissions via Capacitor Push Notifications API
    let pushPerm = await PushNotifications.checkPermissions();
    if (pushPerm.receive !== 'granted') {
      pushPerm = await PushNotifications.requestPermissions();
    }

    if (pushPerm.receive === 'granted') {
      await PushNotifications.register().catch(e => console.warn('[FCM] Push registration warning:', e));

      // 2. Also ensure Local Notification permissions are granted for Android heads-up alerts
      try {
        let localPerm = await LocalNotifications.checkPermissions();
        if (localPerm.display !== 'granted') {
          localPerm = await LocalNotifications.requestPermissions();
        }
      } catch {}

      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to request native push notification permissions:', error);
    return false;
  }
}

/**
 * Checks if native notifications are currently granted by the user or OS.
 */
export async function checkNativeNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() && !Capacitor.isPluginAvailable('LocalNotifications')) {
    return false;
  }
  try {
    if (Capacitor.isPluginAvailable('LocalNotifications')) {
      const localPerm = await LocalNotifications.checkPermissions();
      if (localPerm.display === 'granted') return true;
    }
    if (Capacitor.isPluginAvailable('PushNotifications')) {
      const pushPerm = await PushNotifications.checkPermissions();
      if (pushPerm.receive === 'granted') return true;
    }
  } catch (e) {
    console.warn('checkNativeNotificationPermission error:', e);
  }
  return false;
}

/**
 * Initializes native Android notification channels and requests permissions.
 * This ensures Android will wake the device and display notifications even when the app is closed.
 */
export async function initNativeNotifications(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() && !Capacitor.isPluginAvailable('LocalNotifications')) {
    return false;
  }

  try {
    // 1. Request Local Notification permissions (Android 13+ POST_NOTIFICATIONS)
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      permStatus = await LocalNotifications.requestPermissions();
    }

    if (permStatus.display === 'granted') {
      // 2. Create high-importance Android Notification Channels
      const alertsChannel: Channel = {
        id: 'medicine_alerts',
        name: 'Medicine Expiry & Refill Alerts',
        description: 'Scheduled alerts for expiring medications and refills even when the app is closed',
        importance: 5, // High importance (heads-up notification banner, sound, vibration)
        visibility: 1, // Visible on lockscreen
        sound: 'res_default',
        vibration: true,
        lights: true,
        lightColor: '#0f9d58'
      };

      const dailyChannel: Channel = {
        id: 'medicine_reminders',
        name: 'Daily Medicine Schedule',
        description: 'Reminders to take scheduled medicines',
        importance: 5,
        visibility: 1,
        sound: 'res_default',
        vibration: true,
        lights: true,
        lightColor: '#1a73e8'
      };

      await LocalNotifications.createChannel(alertsChannel).catch(() => {});
      await LocalNotifications.createChannel(dailyChannel).catch(() => {});
    }

    // 3. Register for Firebase Cloud Messaging (Push Notifications) and listen for messages
    try {
      if (Capacitor.isPluginAvailable('PushNotifications')) {
        let pushPerm = await PushNotifications.checkPermissions();
        if (pushPerm.receive !== 'granted') {
          pushPerm = await PushNotifications.requestPermissions();
        }
        if (pushPerm.receive === 'granted') {
          // Remove existing listeners before re-attaching
          await PushNotifications.removeAllListeners();

          // On successful FCM registration token received
          PushNotifications.addListener('registration', (token) => {
            console.log('[FCM] Push registration successful, FCM Token:', token.value);
            try {
              localStorage.setItem('dawasnap_fcm_token', token.value);
              localStorage.setItem('dawalens_fcm_token', token.value);
            } catch {
              // Ignore storage errors
            }
          });

          // Registration error
          PushNotifications.addListener('registrationError', (error) => {
            console.warn('[FCM] Push registration error:', error);
          });

          // When a push notification message arrives while app is open
          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('[FCM] Push notification received in foreground:', notification);
            // Show as local notification banner so user sees heads-up
            LocalNotifications.schedule({
              notifications: [
                {
                  title: notification.title || 'DawaSnap Alert',
                  body: notification.body || '',
                  id: Math.floor(Math.random() * 1000000) + 1,
                  schedule: { at: new Date(Date.now() + 100) },
                  channelId: 'medicine_alerts',
                  smallIcon: 'ic_launcher',
                  extra: notification.data || {},
                  isExactNotification: false
                }
              ]
            }).catch(() => {});
          });

          // When user taps on a push notification
          PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('[FCM] Push notification action performed:', action);
          });

          await PushNotifications.register().catch(() => {});
        }
      }
    } catch (pushErr) {
      console.warn('Native push registration warning (non-fatal):', pushErr);
    }

    return permStatus.display === 'granted';
  } catch (error) {
    console.error('Failed to initialize native notifications:', error);
    return false;
  }
}

/**
 * Schedules on-device Local Notifications for all active medicines.
 * Displays scheduled heads-up notification reminders on expiration milestone dates
 * even when the app is closed.
 */
export async function scheduleNativeMedicineAlerts(
  medicines: Medicine[],
  alertThreshold: number = 90
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      return;
    }

    // Cancel previously scheduled local notifications to keep them synchronized
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const notificationsToSchedule: LocalNotificationSchema[] = [];
    const now = new Date();

    for (const m of medicines) {
      if (m.isDeleted || m.taken || !m.expirationDate) {
        continue;
      }

      const [year, month, day] = m.expirationDate.split('-').map(Number);
      if (!year || !month || !day) {
        continue;
      }

      // Schedule alerts at 9:00 AM on the respective days
      const expiryDate = new Date(year, month - 1, day, 9, 0, 0);

      // 1. Stage: 30 Days before expiration
      const date30Days = new Date(expiryDate.getTime() - (30 * 24 * 60 * 60 * 1000));
      if (date30Days.getTime() > now.getTime()) {
        notificationsToSchedule.push({
          title: `📅 Expiry Notice: ${m.name}`,
          body: `Your medicine ${m.name} expires in 1 month on ${m.expirationDate}. Check refills soon.`,
          id: generateNotificationId(`${m.id}_stage_30`),
          schedule: {
            at: date30Days,
            allowWhileIdle: true // Wakes device even in Android Doze mode
          },
          channelId: 'medicine_alerts',
          smallIcon: 'ic_launcher',
          extra: { medicineId: m.id, type: '30_DAYS' },
          isExactNotification: false
        });
      }

      // 2. Stage: 7 Days before expiration
      const date7Days = new Date(expiryDate.getTime() - (7 * 24 * 60 * 60 * 1000));
      if (date7Days.getTime() > now.getTime()) {
        notificationsToSchedule.push({
          title: `⚠️ Expiry Warning: ${m.name}`,
          body: `Urgent: ${m.name} expires in 7 days on ${m.expirationDate}. Please consult your doctor or pharmacy for a refill.`,
          id: generateNotificationId(`${m.id}_stage_7`),
          schedule: {
            at: date7Days,
            allowWhileIdle: true
          },
          channelId: 'medicine_alerts',
          smallIcon: 'ic_launcher',
          extra: { medicineId: m.id, type: '7_DAYS' },
          isExactNotification: false
        });
      }

      // 3. Stage: On Expiration Day
      if (expiryDate.getTime() > now.getTime()) {
        notificationsToSchedule.push({
          title: `🚨 Medicine Expired: ${m.name}`,
          body: `${m.name} has expired today (${m.expirationDate}). Do not consume and dispose of safely.`,
          id: generateNotificationId(`${m.id}_stage_expired`),
          schedule: {
            at: expiryDate,
            allowWhileIdle: true
          },
          channelId: 'medicine_alerts',
          smallIcon: 'ic_launcher',
          extra: { medicineId: m.id, type: 'EXPIRED' },
          isExactNotification: false
        });
      }

      // 4. Custom threshold if different from 30 and 7
      if (alertThreshold > 0 && alertThreshold !== 30 && alertThreshold !== 7) {
        const customDate = new Date(expiryDate.getTime() - (alertThreshold * 24 * 60 * 60 * 1000));
        if (customDate.getTime() > now.getTime()) {
          notificationsToSchedule.push({
            title: `⏳ Expiry Reminder: ${m.name}`,
            body: `${m.name} will expire in ${alertThreshold} days on ${m.expirationDate}.`,
            id: generateNotificationId(`${m.id}_stage_custom`),
            schedule: {
              at: customDate,
              allowWhileIdle: true
            },
            channelId: 'medicine_alerts',
            smallIcon: 'ic_launcher',
            extra: { medicineId: m.id, type: 'CUSTOM' },
            isExactNotification: false
          });
        }
      }
    }

    // Schedule all up to the OS limit (Android supports up to 500 scheduled alarms per app)
    if (notificationsToSchedule.length > 0) {
      // Chunk into batches of 50 to avoid any IPC limits
      const CHUNK_SIZE = 50;
      for (let i = 0; i < notificationsToSchedule.length; i += CHUNK_SIZE) {
        const chunk = notificationsToSchedule.slice(i, i + CHUNK_SIZE);
        await LocalNotifications.schedule({ notifications: chunk });
      }
    }
  } catch (error) {
    console.error('Failed to schedule native medicine alerts:', error);
  }
}
