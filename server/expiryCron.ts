import { sendEmailDirectServer, getExpiryEmailHTMLServer, ExpiryStage } from "./emailTemplates.ts";
import firebaseConfig from "../firebase-applet-config.json";

// In-memory record of already notified alerts for this server process
// Format: `${medicineId}_${stage}_${dateStr}`
const notifiedAlerts = new Set<string>();

/**
 * Checks all active medicines in Firestore and triggers background alerts
 * according to the exact policy:
 * - Stage 1: Exactly 30 days before expiration (1 month notice)
 * - Stage 2: Exactly 7 days before expiration (1 week urgent reminder)
 * - Stage 3: On or after expiration date (Expired warning with disposal advice)
 *
 * Runs automatically every 4 hours in the server background even if the user never opens the app.
 */
export async function runBackgroundExpiryCheck(): Promise<void> {
  const projectId = firebaseConfig.projectId;
  const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";

  if (!projectId) {
    return;
  }

  try {
    // 1. Fetch user configs to identify active user emails and notification preferences
    const usersUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/userConfigs`;
    const usersResp = await fetch(usersUrl);
    
    // Map userId -> { email, emailNotificationsEnabled }
    const userMap = new Map<string, { email: string; emailNotificationsEnabled: boolean }>();

    if (usersResp.ok) {
      const usersData: any = await usersResp.json();
      if (usersData && usersData.documents) {
        for (const doc of usersData.documents) {
          const fields = doc.fields;
          const uid = fields?.userId?.stringValue;
          const email = fields?.email?.stringValue;
          const emailNotificationsEnabled = fields?.emailNotificationsEnabled?.booleanValue !== false;
          if (uid && email) {
            userMap.set(uid, { email, emailNotificationsEnabled });
          }
        }
      }
    }

    // 2. Fetch active medicines collection
    const medicinesUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/medicines?pageSize=300`;
    const medsResp = await fetch(medicinesUrl);
    if (!medsResp.ok) {
      return;
    }

    const medsData: any = await medsResp.json();
    if (!medsData || !medsData.documents) {
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const doc of medsData.documents) {
      const f = doc.fields;
      if (!f) continue;

      const isDeleted = f.isDeleted?.booleanValue === true;
      const taken = f.taken?.booleanValue === true;
      if (isDeleted || taken) continue;

      const enableEmailExpiryAlert = f.enableEmailExpiryAlert?.booleanValue !== false;
      if (!enableEmailExpiryAlert) continue;

      const name = f.name?.stringValue || "Medicine";
      const expirationDate = f.expirationDate?.stringValue;
      const userId = f.userId?.stringValue;
      const stock = f.quantity?.integerValue || f.quantity?.doubleValue || "1";
      const medId = f.id?.stringValue || doc.name.split("/").pop();

      if (!expirationDate || !userId) continue;

      const userInfo = userMap.get(userId);
      if (!userInfo || !userInfo.email || !userInfo.emailNotificationsEnabled) {
        continue;
      }

      // Calculate days until expiry
      const [year, month, day] = expirationDate.split("-").map(Number);
      if (!year || !month || !day) continue;

      const expiry = new Date(year, month - 1, day);
      expiry.setHours(0, 0, 0, 0);

      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      let stageToSend: ExpiryStage | null = null;

      // Policy:
      // 1. 1 month earlier (approx 30 days, or exactly 30 or 31 days)
      if (diffDays === 30 || diffDays === 31) {
        stageToSend = "30_DAYS";
      }
      // 2. 7 days earlier
      else if (diffDays === 7) {
        stageToSend = "7_DAYS";
      }
      // 3. Expired (today or past expiry date)
      else if (diffDays <= 0 && diffDays >= -14) {
        // Alert for recently expired medicines (within 2 weeks of expiration)
        stageToSend = "EXPIRED";
      }

      if (stageToSend) {
        const dedupeKey = `${medId}_${stageToSend}_${now.toISOString().split("T")[0]}`;
        const stageSentKey = `${medId}_${stageToSend}`;

        if (notifiedAlerts.has(dedupeKey) || (stageToSend === "EXPIRED" && notifiedAlerts.has(stageSentKey))) {
          continue;
        }

        const subject = stageToSend === "EXPIRED"
          ? `🚨 URGENT: ${name} Expired - Please Dispose Safely`
          : (stageToSend === "7_DAYS"
              ? `⚠️ Expiry Warning: ${name} Expires in 7 Days`
              : `📅 Expiry Notice: ${name} Expires in 1 Month`);

        const text = stageToSend === "EXPIRED"
          ? `Your medicine ${name} has expired on ${expirationDate}. Please do not take this medication and dispose of it safely.`
          : (stageToSend === "7_DAYS"
              ? `Your medicine ${name} will expire in 7 days on ${expirationDate}. Please consult your doctor or pharmacy for a refill.`
              : `Your medicine ${name} will expire in 1 month on ${expirationDate}.`);

        const html = getExpiryEmailHTMLServer(name, stock, expirationDate, stageToSend);

        console.log(`[BACKGROUND EXPIRY CRON] Dispatching ${stageToSend} alert for ${name} to ${userInfo.email}`);
        await sendEmailDirectServer(userInfo.email, subject, html, text);

        notifiedAlerts.add(dedupeKey);
        if (stageToSend === "EXPIRED") {
          notifiedAlerts.add(stageSentKey);
        }
      }
    }
  } catch (err) {
    console.error("[BACKGROUND EXPIRY CRON ERROR]", err);
  }
}

/**
 * Initializes the background cron schedule
 */
export function startExpiryCron(): void {
  // Run once shortly after startup (after 30 seconds to allow services to initialize)
  setTimeout(() => {
    runBackgroundExpiryCheck().catch(err => console.error("Initial expiry cron run failed:", err));
  }, 30 * 1000);

  // Check every 4 hours automatically
  const FOUR_HOURS = 4 * 60 * 60 * 1000;
  setInterval(() => {
    runBackgroundExpiryCheck().catch(err => console.error("Periodic expiry cron run failed:", err));
  }, FOUR_HOURS);

  console.log("[BACKGROUND EXPIRY CRON] Service initialized. Schedule: 1 Month, 7 Days, and Expired (with safe disposal warnings).");
}
