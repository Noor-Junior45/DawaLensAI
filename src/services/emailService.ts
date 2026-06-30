import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Dispatches an email alert using the backend SMTP nodemailer server route
 * and records a copy of the message in the Firestore 'mail' collection to populate the mailbox history.
 */
export async function sendEmailAlert(params: EmailParams): Promise<{ success: boolean; simulated?: boolean; message?: string }> {
  try {
    // 1. Call our custom Express nodemailer API
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
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

/**
 * Returns HTML for beautiful Expiry Alert email matching user screenshot
 */
export function getExpiryEmailHTML(medicineName: string, stock: number | string, expiryDate: string): string {
  return `
    <div style="background-color: #f2f5f8; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
      <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01);">
        
        <!-- Header -->
        <h2 style="color: #d97706; font-size: 22px; font-weight: bold; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: inline-block;">
          ⚠️ Expiry Alert: DawaLens AI
        </h2>
        
        <!-- Salutation & Intro -->
        <p style="color: #374151; font-size: 15px; margin: 0 0 12px 0; line-height: 1.6;">Hello,</p>
        <p style="color: #374151; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
          The following items in your inventory are expiring soon or have already expired. Please take action immediately.
        </p>
        
        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; background-color: #f9fafb;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px 16px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 50%;">Product Name</th>
              <th style="padding: 12px 16px; text-align: center; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 20%;">Stock</th>
              <th style="padding: 12px 16px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; width: 30%;">Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #ffffff;">
              <td style="padding: 12px 16px; font-size: 14px; color: #1f2937; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">${medicineName}</td>
              <td style="padding: 12px 16px; font-size: 14px; color: #1f2937; text-align: center; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">${stock}</td>
              <td style="padding: 12px 16px; font-size: 14px; color: #dc2626; font-weight: bold; border-bottom: 1px solid #e5e7eb;">${expiryDate}</td>
            </tr>
          </tbody>
        </table>
        
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
  `;
}

/**
 * Returns HTML for beautiful Low Stock/Refill Alert email matching user screenshot
 */
export function getLowStockEmailHTML(medicineName: string, stock: number | string, threshold: number | string): string {
  return `
    <div style="background-color: #f2f5f8; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
      <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01);">
        
        <!-- Header -->
        <h2 style="color: #2563eb; font-size: 22px; font-weight: bold; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: inline-block;">
          💊 Refill Required: DawaLens AI
        </h2>
        
        <!-- Salutation & Intro -->
        <p style="color: #374151; font-size: 15px; margin: 0 0 12px 0; line-height: 1.6;">Hello,</p>
        <p style="color: #374151; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
          The following items in your inventory are running extremely low on stock. Please replenish your supplies soon.
        </p>
        
        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; background-color: #f9fafb;">
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
  `;
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

  return `
    <div style="background-color: #f2f5f8; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
      <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01);">
        
        <!-- Header -->
        <h2 style="color: #0f9d58; font-size: 22px; font-weight: bold; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: inline-block;">
          ❇️ Consultation Report: DawaLens AI
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
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; background-color: #f9fafb;">
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

        <!-- Chat History/Summary -->
        <h3 style="color: #1f2937; font-size: 16px; font-weight: bold; margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          Consultation Conversation Log
        </h3>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 28px; max-height: 400px; overflow-y: auto; font-size: 14px; line-height: 1.6; color: #374151;">
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
  `;
}
