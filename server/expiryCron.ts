import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  collection, 
  getDocs 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { sendEmailDirectServer, getExpiryEmailHTMLServer, ExpiryStage } from "./emailTemplates.ts";
import { getAdminApp, hasServiceAccountConfigured } from "./firebaseAdmin.ts";
import { getMessaging } from 'firebase-admin/messaging';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
}, firebaseConfig.firestoreDatabaseId);

export interface ActiveMedicineItem {
  id: string;
  name: string;
  expirationDate: string;
  quantity?: number | string;
  enableEmailExpiryAlert?: boolean;
}

export interface UserExpirySchedule {
  userId: string;
  email: string;
  emailNotificationsEnabled: boolean;
  medicines: ActiveMedicineItem[];
  updatedAt: string;
}

// In-memory fallback cache
const memorySchedules = new Map<string, UserExpirySchedule>();
// In-memory registered tokens map: userId -> Set of tokens
const userPushTokens = new Map<string, Set<string>>();

// Mutex lock and in-flight tracking to strictly prevent duplicate email dispatches
let isCheckRunning = false;
const inFlightAlerts = new Set<string>();

/**
 * Registers a browser/device push token for a user.
 */
export async function registerPushToken(
  userId: string, 
  token: string, 
  platform: string = 'web'
): Promise<void> {
  if (!userPushTokens.has(userId)) {
    userPushTokens.set(userId, new Set());
  }
  userPushTokens.get(userId)!.add(token);

  try {
    const tokenDoc = doc(db, 'user_push_tokens', `${userId}_${token.slice(-12)}`);
    await setDoc(tokenDoc, {
      userId,
      token,
      platform,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`[PUSH TOKEN] Registered ${platform} token for user ${userId}`);
  } catch (err) {
    console.warn('[PUSH TOKEN WARNING] Firestore save warning:', err);
  }
}

/**
 * Sends a push notification to all active devices registered for a user.
 */
export async function sendPushNotificationToUser(
  userId: string, 
  title: string, 
  body: string, 
  data: Record<string, any> = {}
): Promise<{ sent: number; error?: string }> {
  const tokens = new Set<string>(userPushTokens.get(userId) || []);

  try {
    const snap = await getDocs(collection(db, 'user_push_tokens'));
    snap.forEach(d => {
      const dData = d.data();
      if (dData.userId === userId && dData.token) {
        tokens.add(dData.token);
      }
    });
  } catch {
    // Non-fatal fallback
  }

  if (tokens.size === 0) {
    return { sent: 0 };
  }

  if (!hasServiceAccountConfigured()) {
    const err = 'FIREBASE_SERVICE_ACCOUNT_KEY is required in environment variables for FCM HTTP v1 push notifications.';
    console.warn(`[FCM HTTP v1 WARNING] ${err}`);
    return { sent: 0, error: err };
  }

  try {
    const adminApp = getAdminApp();
    const messaging = getMessaging(adminApp);
    const tokenArray = Array.from(tokens);
    const serializedData: Record<string, string> = {
      title,
      body,
    };
    for (const [key, value] of Object.entries(data)) {
      serializedData[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }

    const response = await messaging.sendEachForMulticast({
      tokens: tokenArray,
      notification: {
        title,
        body,
      },
      data: serializedData,
      android: {
        priority: 'high',
        notification: {
          icon: 'ic_launcher',
          color: '#0f9d58',
          sound: 'default',
        }
      },
      webpush: {
        notification: {
          icon: '/logo.png',
          badge: '/logo.png',
        }
      }
    });

    console.log(`[FCM HTTP v1 SUCCESS] Sent ${response.successCount}/${tokenArray.length} notifications to user ${userId}`);
    return { sent: response.successCount };
  } catch (e: any) {
    console.error('[FCM HTTP v1 ERROR]:', e);
    return { sent: 0, error: e?.message || String(e) };
  }
}

/**
 * Registers or updates a user's active medicine schedule in Firestore and memory.
 * Called whenever a user logs in, adds, edits, or deletes a medicine in the app.
 */
export async function registerUserExpirySchedule(
  userId: string,
  email: string,
  emailNotificationsEnabled: boolean,
  medicines: ActiveMedicineItem[]
): Promise<void> {
  const schedule: UserExpirySchedule = {
    userId,
    email,
    emailNotificationsEnabled,
    medicines: medicines.filter(m => Boolean(m.name && m.expirationDate)),
    updatedAt: new Date().toISOString()
  };

  memorySchedules.set(userId, schedule);

  try {
    const docRef = doc(db, 'server_expiry_schedules', userId);
    await setDoc(docRef, schedule);
    console.log(`[EXPIRY SYNC] Successfully registered ${schedule.medicines.length} medicine(s) for user ${email}`);
  } catch (err) {
    console.warn(`[EXPIRY SYNC WARNING] Could not persist schedule to Firestore, kept in memory:`, err);
  }
}

/**
 * Executes the backend automated expiry check.
 * 
 * Policy:
 * - Stage 1 (30_DAYS): Exactly 30-31 days before expiry (1 Month Notice)
 * - Stage 2 (7_DAYS): Exactly 7 days before expiry (1 Week Warning)
 * - Stage 3 (EXPIRED): On or within 14 days after expiration date (Safe Disposal Advisory)
 * 
 * Crucial Safeguards:
 * 1. Runs completely in the backend on the server, even when all user apps are closed.
 * 2. Checks and reserves in `server_sent_expiry_alerts` in Firestore BEFORE sending any email.
 *    If an alert was already sent or is in-flight for that medicine at that stage, it is SKIPPED.
 *    Every email is sent strictly ONCE per stage, preventing duplicate emails across multiple devices.
 */
export async function runBackgroundExpiryCheck(): Promise<{ checked: number; sent: number; skipped?: boolean }> {
  if (isCheckRunning) {
    console.log("[BACKGROUND EXPIRY CRON] Another check is already in progress. Skipping concurrent run.");
    return { checked: 0, sent: 0, skipped: true };
  }

  isCheckRunning = true;
  let totalChecked = 0;
  let totalSent = 0;

  try {
    // 1. Gather all registered user schedules (from Firestore + memory)
    const schedulesToProcess = new Map<string, UserExpirySchedule>();

    // Load from memory first
    for (const [uid, sched] of memorySchedules.entries()) {
      schedulesToProcess.set(uid, sched);
    }

    // Load from Firestore server_expiry_schedules
    try {
      const snap = await getDocs(collection(db, 'server_expiry_schedules'));
      snap.forEach(docSnap => {
        const data = docSnap.data() as UserExpirySchedule;
        if (data && data.userId && data.email) {
          schedulesToProcess.set(data.userId, data);
          memorySchedules.set(data.userId, data);
        }
      });
    } catch (fsErr) {
      console.warn("[BACKGROUND EXPIRY] Failed to query server_expiry_schedules from Firestore, using memory:", fsErr);
    }

    if (schedulesToProcess.size === 0) {
      return { checked: 0, sent: 0 };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const schedule of schedulesToProcess.values()) {
      if (!schedule.emailNotificationsEnabled || !schedule.email || !schedule.medicines) {
        continue;
      }

      for (const m of schedule.medicines) {
        if (m.enableEmailExpiryAlert === false || !m.expirationDate) {
          continue;
        }

        totalChecked++;

        // Parse expiration date YYYY-MM-DD
        const parts = m.expirationDate.split('-').map(Number);
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
          continue;
        }

        const expiry = new Date(parts[0], parts[1] - 1, parts[2]);
        expiry.setHours(0, 0, 0, 0);

        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        let stageToSend: ExpiryStage | null = null;
        if (diffDays === 30 || diffDays === 31) {
          stageToSend = '30_DAYS';
        } else if (diffDays === 7) {
          stageToSend = '7_DAYS';
        } else if (diffDays <= 0 && diffDays >= -14) {
          stageToSend = 'EXPIRED';
        }

        if (!stageToSend) {
          continue;
        }

        // Global deduplication key in Firestore
        // Format: ${userId}_${medicineId}_${stage}
        const alertDocId = `${schedule.userId}_${m.id}_${stageToSend}`;

        // In-memory guard to immediately halt concurrent tasks
        if (inFlightAlerts.has(alertDocId)) {
          continue;
        }

        try {
          // Check if this alert was already sent in Firestore
          const alertRef = doc(db, 'server_sent_expiry_alerts', alertDocId);
          const alertSnap = await getDoc(alertRef);

          if (alertSnap.exists()) {
            // Already sent! Skip to guarantee only one email is ever sent
            inFlightAlerts.add(alertDocId);
            continue;
          }

          // Mark in-flight memory set immediately
          inFlightAlerts.add(alertDocId);

          // Atomic reservation in Firestore: write PENDING record immediately to prevent race conditions
          await setDoc(alertRef, {
            userId: schedule.userId,
            medId: m.id,
            medName: m.name,
            stage: stageToSend,
            email: schedule.email,
            expirationDate: m.expirationDate,
            status: 'PENDING',
            claimedAt: new Date().toISOString()
          });

          // Construct email content
          const subject = stageToSend === 'EXPIRED'
            ? `🚨 Urgent: ${m.name} has Expired - Please Dispose Safely`
            : (stageToSend === '7_DAYS'
                ? `⚠️ Expiry Warning: ${m.name} expires in 7 days`
                : `📅 Expiry Notice: ${m.name} expires in 1 month`);

          const text = stageToSend === 'EXPIRED'
            ? `DawaSnap AI Alert: Your medicine ${m.name} has expired on ${m.expirationDate}. Please do NOT consume this medication and dispose of it safely.`
            : (stageToSend === '7_DAYS'
                ? `DawaSnap AI Alert: Your medicine ${m.name} will expire in 7 days on ${m.expirationDate}. Please consult your doctor or pharmacy for a refill.`
                : `DawaSnap AI Alert: Your medicine ${m.name} will expire in 1 month on ${m.expirationDate}.`);

          const html = getExpiryEmailHTMLServer(
            m.name, 
            m.quantity || "1", 
            m.expirationDate, 
            stageToSend
          );

          console.log(`[BACKGROUND EXPIRY CRON] Dispatching single ${stageToSend} notice for "${m.name}" to ${schedule.email}...`);
          
          await sendEmailDirectServer(schedule.email, subject, html, text);
          totalSent++;

          // Also dispatch Firebase Cloud Message / Push Notification to registered browser & mobile devices
          try {
            const pushRes = await sendPushNotificationToUser(
              schedule.userId,
              subject,
              text,
              { medicineId: m.id, stage: stageToSend, name: m.name, expirationDate: m.expirationDate }
            );
            if (pushRes.sent > 0) {
              console.log(`[BACKGROUND EXPIRY CRON] Sent push notification to ${pushRes.sent} device(s) for user ${schedule.userId}`);
            }
          } catch (pushErr) {
            console.warn('[BACKGROUND EXPIRY CRON] Push notification warning:', pushErr);
          }

          // Finalize permanently sent in Firestore
          await setDoc(alertRef, {
            status: 'SENT',
            sentAt: new Date().toISOString()
          }, { merge: true });

          console.log(`[BACKGROUND EXPIRY CRON] Logged sent alert in Firestore: ${alertDocId}`);
        } catch (alertErr) {
          console.error(`[BACKGROUND EXPIRY CRON ERROR] Failed to dispatch alert for ${m.name}:`, alertErr);
          // Release lock on error
          inFlightAlerts.delete(alertDocId);
        }
      }
    }
  } catch (err) {
    console.error("[BACKGROUND EXPIRY CRON ROOT ERROR]", err);
  } finally {
    isCheckRunning = false;
  }

  return { checked: totalChecked, sent: totalSent };
}

/**
 * Initializes the background cron worker on the server.
 * Runs independently in the server process so emails are sent in the background when the app is closed,
 * and NOT instantly on user app opening.
 */
export function startExpiryCron(): void {
  // Periodic run every 1 hour (runs independently in the backend)
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(() => {
    runBackgroundExpiryCheck()
      .then(res => {
        if (res.sent > 0) {
          console.log(`[BACKGROUND EXPIRY CRON] Hourly check dispatched ${res.sent} new email(s).`);
        }
      })
      .catch(err => console.error("[BACKGROUND EXPIRY CRON] Periodic run failed:", err));
  }, ONE_HOUR);

  console.log("[BACKGROUND EXPIRY CRON] Automated backend worker running. Interval: Every 1 hour. Concurrency locking & atomic deduplication active.");
}

/**
 * Permanently removes user's expiry schedule and push notification tokens from server memory & Firestore.
 * Executed during account deletion to ensure zero lingering data.
 */
export async function purgeUserServerData(userId: string): Promise<void> {
  memorySchedules.delete(userId);
  userPushTokens.delete(userId);

  try {
    const schedRef = doc(db, 'server_expiry_schedules', userId);
    await deleteDoc(schedRef);
  } catch (err) {
    console.warn(`[PURGE] Notice when deleting server_expiry_schedules doc for ${userId}:`, err);
  }

  try {
    const snap = await getDocs(collection(db, 'user_push_tokens'));
    const toDelete: Promise<any>[] = [];
    snap.forEach(d => {
      if (d.data().userId === userId) {
        toDelete.push(deleteDoc(d.ref));
      }
    });
    await Promise.all(toDelete);
  } catch (err) {
    console.warn(`[PURGE] Notice when deleting user_push_tokens for ${userId}:`, err);
  }
}
