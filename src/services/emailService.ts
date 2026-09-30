import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getDirectRenderUrl } from '../utils/apiConfig';

export interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Synchronizes user's active medicines with the backend server.
 * The backend cron runs 24/7 in the background and sends emails strictly ONCE
 * per medicine stage when the app is closed, preventing multi-device duplicate emails.
 */
export async function syncExpiryScheduleWithServer(
  userId: string,
  email: string,
  emailNotificationsEnabled: boolean,
  medicines: Array<{
    id: string;
    name: string;
    expirationDate?: string;
    quantity?: number;
    enableEmailExpiryAlert?: boolean;
    isDeleted?: boolean;
    taken?: boolean;
  }>
): Promise<void> {
  if (!userId || !email) return;

  const activeMeds = medicines
    .filter(m => !m.isDeleted && !m.taken && m.expirationDate)
    .map(m => ({
      id: m.id,
      name: m.name,
      expirationDate: m.expirationDate!,
      quantity: m.quantity || 1,
      enableEmailExpiryAlert: m.enableEmailExpiryAlert !== false
    }));

  const payload = JSON.stringify({
    userId,
    email,
    emailNotificationsEnabled,
    medicines: activeMeds
  });

  try {
    let res = await fetch('/api/sync-expiry-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    if (!res.ok || res.status === 404) {
      try {
        await fetch(getDirectRenderUrl('/api/sync-expiry-schedule'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        });
      } catch (err) {}
    }
  } catch (e) {
    console.warn('[EMAIL SERVICE] Expiry schedule sync skipped:', e);
  }
}

/**
 * Dispatches an email alert using the backend SMTP nodemailer server route
 * and records a copy of the message in the Firestore 'mail' collection to populate the mailbox history.
 */
export async function sendEmailAlert(params: EmailParams): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    // 1. Call our custom Express nodemailer API (proxied to Render or direct Render)
    let response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (!response.ok || response.status === 404) {
      try {
        response = await fetch(getDirectRenderUrl('/api/send-email'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
      } catch (e) {}
    }
    
    if (response.ok) {
      const data = await response.json();
      
      // Save copy in Firestore 'mail' collection so the mailbox inbox history updates in real-time
      try {
        await addDoc(collection(db, 'mail'), {
          to: params.to,
          message: {
            subject: params.subject,
            text: params.text,
            html: params.html
          },
          timestamp: serverTimestamp(),
          status: {
            state: data.simulated ? 'SIMULATED' : 'SUCCESS',
            updatedAt: Date.now()
          }
        });
      } catch (firestoreErr) {
        console.warn('[EMAIL SERVICE] Optional Firestore backup copy skipped:', firestoreErr);
      }
      
      return data;
    } else {
      const errText = await response.text();
      throw new Error(errText || 'SMTP server returned an error');
    }
  } catch (error: any) {
    console.warn('[EMAIL SERVICE] SMTP API failed, attempting direct Firestore collection write fallback:', error);
    
    // 2. Direct Firestore fallback in case the backend is unreachable or building
    try {
      await addDoc(collection(db, 'mail'), {
        to: params.to,
        message: {
          subject: params.subject,
          text: params.text,
          html: params.html
        },
        timestamp: serverTimestamp()
      });
      return { success: true, message: "Dispatched to Firestore collection" };
    } catch (fallbackError: any) {
      console.error('[EMAIL SERVICE] Firestore fallback also failed:', fallbackError);
      throw new Error(`Email transmission failed: ${error.message || error}`);
    }
  }
}

export type ExpiryStage = '30_DAYS' | '7_DAYS' | 'EXPIRED';

/**
 * Returns HTML for beautiful Expiry Alert email with explicit stage messaging and disposal warning
 */
export function getExpiryEmailHTML(
  medicineName: string, 
  stock: number | string, 
  expiryDate: string,
  stage: ExpiryStage = '30_DAYS'
): string {
  const isExpired = stage === 'EXPIRED';
  const is7Days = stage === '7_DAYS';

  const titleColor = isExpired ? '#dc2626' : (is7Days ? '#ea580c' : '#d97706');
  const badgeText = isExpired ? 'EXPIRED MEDICINE WARNING' : (is7Days ? '7 DAYS UNTIL EXPIRY' : '1 MONTH EXPIRY NOTICE');
  const badgeBg = isExpired ? '#fef2f2' : (is7Days ? '#fff7ed' : '#fffbeb');
  const badgeBorder = isExpired ? '#fca5a5' : (is7Days ? '#fdba74' : '#fde68a');
  const badgeTextColor = isExpired ? '#b91c1c' : (is7Days ? '#c2410c' : '#b45309');

  const mainHeader = isExpired 
    ? `🚨 Urgent: ${medicineName} has Expired - Do Not Consume`
    : (is7Days 
        ? `⚠️ Expiry Warning: ${medicineName} expires in 7 days`
        : `📅 Expiry Notice: ${medicineName} expires in 1 month`);

  const introText = isExpired
    ? `Our records show that <strong>${medicineName}</strong> has reached its expiration date (${expiryDate}). <strong>Please DO NOT take this medicine.</strong> Expired medications can lose chemical potency or produce dangerous degradation compounds.`
    : (is7Days
        ? `This is a reminder that <strong>${medicineName}</strong> will expire in approximately <strong>7 days</strong> (${expiryDate}). Please consult your physician or pharmacist to arrange a fresh refill before this date.`
        : `This is an advance 1-month reminder that <strong>${medicineName}</strong> will expire next month on <strong>${expiryDate}</strong>.`);

  const safetyCallout = isExpired
    ? `<div style="background-color: #fee2e2; border-left: 5px solid #dc2626; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <h4 style="color: #991b1b; margin: 0 0 8px 0; font-size: 15px; font-weight: bold;">⚠️ Critical Disposal & Safety Advisory:</h4>
        <ul style="color: #7f1d1d; margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
          <li><strong>DO NOT INGEST OR USE:</strong> Stop using this medicine immediately.</li>
          <li><strong>Safe Disposal:</strong> Do not flush down toilets or throw loose in the trash. Take it to a designated pharmacy take-back drop-off or mix with coffee grounds in a sealed pouch before disposal.</li>
          <li><strong>Mark or Discard:</strong> Keep out of reach of children and separate from your active medicine box.</li>
        </ul>
      </div>`
    : (is7Days
        ? `<div style="background-color: #ffedd5; border-left: 5px solid #ea580c; padding: 14px 16px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #9a3412; margin: 0; font-size: 13px; line-height: 1.5;">
              <strong>Action required:</strong> You have only 7 days remaining before this medicine expires. Please plan your replacement or finish taking as scheduled under your doctor's supervision.
            </p>
          </div>`
        : `<div style="background-color: #fef3c7; border-left: 5px solid #f59e0b; padding: 14px 16px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 13px; line-height: 1.5;">
              <strong>Advance Notice:</strong> Expiry is scheduled for next month. Check your remaining pills to verify if you will need a renewal prescription.
            </p>
          </div>`);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; min-width: 100%!important; width: 100%!important; background-color: #f2f5f8; }
    @media only screen and (max-width: 600px) {
      .email-container { padding: 10px 4px !important; }
      .email-card { padding: 20px 14px !important; border-radius: 12px !important; width: 100% !important; box-sizing: border-box !important; }
      .email-header { font-size: 17px !important; }
      table { width: 100% !important; margin: 12px 0 !important; table-layout: fixed !important; }
      th, td { padding: 8px 6px !important; font-size: 12px !important; word-break: break-word !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f2f5f8;">
  <div class="email-container" style="background-color: #f2f5f8; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; box-sizing: border-box;">
    <div class="email-card" style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); box-sizing: border-box;">
      
      <!-- Badge -->
      <div style="margin-bottom: 12px;">
        <span style="background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeTextColor}; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; display: inline-block;">
          ${badgeText}
        </span>
      </div>

      <!-- Header -->
      <h2 class="email-header" style="color: ${titleColor}; font-size: 20px; font-weight: bold; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.4;">
        ${mainHeader}
      </h2>
      
      <!-- Salutation & Intro -->
      <p style="color: #374151; font-size: 15px; margin: 0 0 12px 0; line-height: 1.6;">Hello,</p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0; line-height: 1.6;">
        ${introText}
      </p>
      
      <!-- Safety Callout Box -->
      ${safetyCallout}

      <!-- Table Wrapper for Responsiveness -->
      <div style="width: 100%; overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; min-width: 100%; overflow: hidden; background-color: #f9fafb; margin: 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 50%;">Medicine Name</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 13px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 22%;">Remaining Stock</th>
              <th style="padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; width: 28%;">Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #ffffff;">
              <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1f2937; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">${medicineName}</td>
              <td style="padding: 12px 16px; font-size: 14px; color: #1f2937; text-align: center; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">${stock} units</td>
              <td style="padding: 12px 16px; font-size: 14px; color: ${isExpired ? '#dc2626' : '#d97706'}; font-weight: bold; border-bottom: 1px solid #e5e7eb;">${expiryDate}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Action Button -->
      <div style="margin: 28px 0; text-align: left;">
        <a href="https://dawalens.vercel.app" target="_blank" style="background-color: #0f9d58; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(15,157,88,0.15);">Open DawaLens Vault</a>
      </div>
      
      <!-- Footer Info -->
      <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0; line-height: 1.5;">
        This automated safety alert was delivered by <strong>DawaLens AI</strong> based on your scheduled alert policy (1 month, 7 days & expired). You can customize or mute these notifications anytime in your account settings.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Returns HTML for beautiful Low Stock/Refill Alert email matching user screenshot
 */
export function getLowStockEmailHTML(medicineName: string, stock: number | string, threshold: number | string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; min-width: 100%!important; width: 100%!important; background-color: #f2f5f8; }
    @media only screen and (max-width: 600px) {
      .email-container { padding: 10px 4px !important; }
      .email-card { padding: 16px 10px !important; border-radius: 12px !important; width: 100% !important; box-sizing: border-box !important; }
      .email-header { font-size: 16px !important; }
      table { width: 100% !important; margin: 12px 0 !important; table-layout: fixed !important; }
      th, td { padding: 8px 6px !important; font-size: 12px !important; word-break: break-word !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f2f5f8;">
  <div class="email-container" style="background-color: #f2f5f8; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; box-sizing: border-box;">
    <div class="email-card" style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01); box-sizing: border-box;">
      
      <!-- Header -->
      <h2 class="email-header" style="color: #2563eb; font-size: 22px; font-weight: bold; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: inline-block;">
        Refill Required: DawaLens AI
      </h2>
      
      <!-- Salutation & Intro -->
      <p style="color: #374151; font-size: 15px; margin: 0 0 12px 0; line-height: 1.6;">Hello,</p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
        The following items in your inventory are running extremely low on stock. Please replenish your supplies soon.
      </p>
      
      <!-- Table Wrapper for Responsiveness -->
      <div style="width: 100%; overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 6px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse; min-width: 100%; overflow: hidden; background-color: #f9fafb; margin: 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px 16px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 50%;">Product Name</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 25%;">Current Stock</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; width: 25%;">Alert Limit</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #ffffff;">
              <td style="padding: 12px 16px; font-size: 14px; color: #1f2937; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">${medicineName}</td>
              <td style="padding: 12px 16px; font-size: 14px; color: #ef4444; font-weight: bold; text-align: center; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">${stock} units</td>
              <td style="padding: 12px 16px; font-size: 14px; color: #6b7280; text-align: center; border-bottom: 1px solid #e5e7eb;">${threshold} units</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Action Button -->
      <div style="margin: 28px 0; text-align: left;">
        <a href="https://dawalens.vercel.app" target="_blank" style="background-color: #0f9d58; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(15,157,88,0.15);">Open App Dashboard</a>
      </div>
      
      <!-- Footer Info -->
      <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0; line-height: 1.5;">
        This is an automated message from <strong>DawaLens AI</strong>. You can disable these alerts in your Settings.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Returns HTML for beautiful Consultation Report email matching user screenshot
 */
export function getConsultationReportEmailHTML(medicinesList: { name: string; dosage?: string }[], chatHistoryHtml: string, dateStr: string): string {
  const medRows = medicinesList.length > 0 
    ? medicinesList.map(m => `
        <tr style="background-color: #ffffff;">
          <td style="padding: 10px 16px; font-size: 14px; color: #1f2937; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">${m.name}</td>
          <td style="padding: 10px 16px; font-size: 14px; color: #4b5563; border-bottom: 1px solid #e5e7eb;">${m.dosage || 'N/A'}</td>
        </tr>
      `).join('')
    : `
        <tr style="background-color: #ffffff;">
          <td colspan="2" style="padding: 12px 16px; font-size: 14px; color: #6b7280; text-align: center; border-bottom: 1px solid #e5e7eb;">No medicines currently listed in active inventory.</td>
        </tr>
      `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; min-width: 100%!important; width: 100%!important; background-color: #f2f5f8; }
    @media only screen and (max-width: 600px) {
      .email-container { padding: 10px 4px !important; }
      .email-card { padding: 16px 10px !important; border-radius: 12px !important; width: 100% !important; box-sizing: border-box !important; }
      .email-header { font-size: 16px !important; }
      table { width: 100% !important; margin-bottom: 12px !important; table-layout: fixed !important; }
      th, td { padding: 8px 6px !important; font-size: 12px !important; word-break: break-word !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f2f5f8;">
  <div class="email-container" style="background-color: #f2f5f8; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; box-sizing: border-box;">
    <div class="email-card" style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01); box-sizing: border-box;">
      
      <!-- Header -->
      <h2 class="email-header" style="color: #0f9d58; font-size: 22px; font-weight: bold; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: inline-block;">
        Consultation Report: DawaLens AI
      </h2>
      
      <p style="color: #374151; font-size: 15px; margin: 0 0 12px 0; line-height: 1.6;">Hello,</p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
        Here is your digital health consultation summary and medical report generated on <strong>${dateStr}</strong>.
      </p>

      <!-- Current Medications Header -->
      <h3 style="color: #1f2937; font-size: 16px; font-weight: bold; margin: 24px 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Current Medications In Vault
      </h3>
      
      <!-- Medications Table -->
      <div style="width: 100%; overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 28px;">
        <table style="width: 100%; border-collapse: collapse; min-width: 100%; overflow: hidden; background-color: #f9fafb; margin: 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 60%;">Medicine Name</th>
              <th style="padding: 10px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; width: 40%;">Strength / Dosage</th>
            </tr>
          </thead>
          <tbody>
            ${medRows}
          </tbody>
        </table>
      </div>

      <!-- Chat History/Summary -->
      <h3 style="color: #1f2937; font-size: 16px; font-weight: bold; margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Consultation Conversation Log
      </h3>
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 28px; max-height: 400px; overflow-y: auto; font-size: 14px; line-height: 1.6; color: #374151; word-wrap: break-word; overflow-wrap: break-word;">
        ${chatHistoryHtml}
      </div>
      
      <!-- Disclaimer -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin: 24px 0; color: #78350f; font-size: 13px; line-height: 1.5;">
        <strong>Disclaimer:</strong> This consultation report was generated by AI for digital bookkeeping and self-tracking. It is purely informational and not a substitute for professional medical diagnosis, treatment, or advice. Please discuss any medicinal routine with your primary care physician.
      </div>

      <!-- Action Button -->
      <div style="margin: 28px 0; text-align: left;">
        <a href="https://dawalens.vercel.app" target="_blank" style="background-color: #0f9d58; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(15,157,88,0.15);">Open App Dashboard</a>
      </div>
      
      <!-- Footer Info -->
      <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0; line-height: 1.5;">
        This is an automated message from <strong>DawaLens AI</strong>. You can disable these alerts in your Settings.
      </p>
    </div>
  </div>
</body>
</html>`;
}
