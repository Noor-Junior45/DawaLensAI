import { Resend } from "resend";

export type ExpiryStage = '30_DAYS' | '7_DAYS' | 'EXPIRED';

export function getExpiryEmailHTMLServer(
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
 * Dispatches an email via Resend directly from the backend server
 */
export async function sendEmailDirectServer(to: string, subject: string, html: string, text: string) {
  let apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    apiKey = apiKey.trim().replace(/^['"]+|['"]+$/g, '');
  }

  const isKeyInvalid = !apiKey || apiKey === 'YOUR_API_KEY' || apiKey.includes('YOUR_RESEND_API_KEY');
  if (isKeyInvalid) {
    console.log(`[BACKGROUND EXPIRY EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true };
  }

  const resend = new Resend(apiKey);
  try {
    const { data, error } = await resend.emails.send({
      from: "DawaLens AI <alerts@noorpos.in>",
      to: [to],
      subject,
      text,
      html
    });

    if (error) {
      // Fallback domain
      const fallbackResult = await resend.emails.send({
        from: "DawaLens AI <onboarding@resend.dev>",
        to: [to],
        subject,
        text,
        html
      });
      return { success: !fallbackResult.error, id: fallbackResult.data?.id };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[BACKGROUND EMAIL ERROR]", err);
    return { success: false, error: err };
  }
}
