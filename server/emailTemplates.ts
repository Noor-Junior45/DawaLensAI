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
    ? `<div class="safety-box" style="background-color: #fee2e2; border-left: 5px solid #dc2626; padding: 16px 18px; border-radius: 10px; margin: 20px 0; box-sizing: border-box; word-break: break-word;">
        <h4 class="safety-title" style="color: #991b1b; margin: 0 0 10px 0; font-size: 15px; font-weight: 800; line-height: 1.4;">⚠️ Critical Disposal &amp; Safety Advisory:</h4>
        <ul class="safety-list" style="color: #7f1d1d; margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
          <li style="margin-bottom: 8px;"><strong>DO NOT INGEST OR USE:</strong> Stop using this medicine immediately.</li>
          <li style="margin-bottom: 8px;"><strong>Safe Disposal:</strong> Do not flush down toilets or throw loose in the trash. Take it to a designated pharmacy take-back drop-off or mix with coffee grounds in a sealed pouch before disposal.</li>
          <li style="margin-bottom: 0;"><strong>Mark or Discard:</strong> Keep out of reach of children and separate from your active medicine box.</li>
        </ul>
      </div>`
    : (is7Days
        ? `<div class="safety-box" style="background-color: #ffedd5; border-left: 5px solid #ea580c; padding: 14px 16px; border-radius: 10px; margin: 20px 0; box-sizing: border-box; word-break: break-word;">
            <p style="color: #9a3412; margin: 0; font-size: 13px; line-height: 1.5;">
              <strong>Action required:</strong> You have only 7 days remaining before this medicine expires. Please plan your replacement or finish taking as scheduled under your doctor's supervision.
            </p>
          </div>`
        : `<div class="safety-box" style="background-color: #fef3c7; border-left: 5px solid #f59e0b; padding: 14px 16px; border-radius: 10px; margin: 20px 0; box-sizing: border-box; word-break: break-word;">
            <p style="color: #92400e; margin: 0; font-size: 13px; line-height: 1.5;">
              <strong>Advance Notice:</strong> Expiry is scheduled for next month. Check your remaining pills to verify if you will need a renewal prescription.
            </p>
          </div>`);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <title>${mainHeader}</title>
  <style type="text/css">
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    table {
      border-collapse: collapse !important;
    }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f2f5f8;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 10px 4px !important;
        width: 100% !important;
      }
      .email-card-cell {
        padding: 20px 12px !important;
        border-radius: 12px !important;
      }
      .email-header {
        font-size: 18px !important;
        line-height: 1.35 !important;
      }
      .intro-text {
        font-size: 13px !important;
        line-height: 1.5 !important;
      }
      .med-table {
        width: 100% !important;
      }
      .med-th {
        padding: 9px 6px !important;
        font-size: 10px !important;
      }
      .med-td {
        padding: 10px 6px !important;
        font-size: 11px !important;
      }
      .safety-box {
        padding: 12px 10px !important;
        margin: 14px 0 !important;
      }
      .safety-title {
        font-size: 13px !important;
      }
      .safety-list {
        padding-left: 16px !important;
        font-size: 11px !important;
      }
      .btn-action {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
        padding: 12px 14px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f2f5f8; width: 100% !important; min-width: 100% !important;">
  <!-- Centering Outer Table for Flawless Mobile Email Client Rendering -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f2f5f8" style="background-color: #f2f5f8; width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" class="email-wrapper" style="padding: 28px 12px;">
        
        <!-- Main Card Table -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); overflow: hidden;">
          <tr>
            <td class="email-card-cell" style="padding: 30px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box;">
              
              <!-- Badge -->
              <div style="margin-bottom: 12px;">
                <span style="background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeTextColor}; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; display: inline-block;">
                  ${badgeText}
                </span>
              </div>

              <!-- Header -->
              <h2 class="email-header" style="color: ${titleColor}; font-size: 20px; font-weight: 800; margin: 0 0 14px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.35;">
                ${mainHeader}
              </h2>
              
              <!-- Salutation & Intro -->
              <p style="color: #374151; font-size: 14px; margin: 0 0 10px 0; line-height: 1.6;">Hello,</p>
              <p class="intro-text" style="color: #374151; font-size: 14px; margin: 0 0 18px 0; line-height: 1.6;">
                ${introText}
              </p>

              <!-- 1. MEDICINE DETAILS TABLE (PLACED FIRST) -->
              <div style="width: 100%; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin: 0 0 18px 0; background-color: #ffffff; box-sizing: border-box;">
                <table class="med-table" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0;">
                  <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                      <th class="med-th" style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; border-right: 1px solid #e2e8f0; width: 44%; word-break: break-word;">Medicine Name</th>
                      <th class="med-th" style="padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; border-right: 1px solid #e2e8f0; width: 26%; word-break: break-word;">Remaining</th>
                      <th class="med-th" style="padding: 10px 10px; text-align: left; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; width: 30%; word-break: break-word;">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="background-color: #ffffff;">
                      <td class="med-td" style="padding: 12px; font-size: 13px; font-weight: 700; color: #1e293b; border-right: 1px solid #e2e8f0; word-break: break-word;">${medicineName}</td>
                      <td class="med-td" style="padding: 12px 8px; font-size: 13px; color: #334155; text-align: center; border-right: 1px solid #e2e8f0; word-break: break-word;">${stock} units</td>
                      <td class="med-td" style="padding: 12px 10px; font-size: 13px; color: ${isExpired ? '#dc2626' : (is7Days ? '#ea580c' : '#d97706')}; font-weight: 800; word-break: break-word;">${expiryDate}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- 2. CRITICAL DISPOSAL & SAFETY ADVISORY (PLACED BELOW MEDICINE TABLE) -->
              ${safetyCallout}

              <!-- Action Button -->
              <div style="margin: 22px 0 18px 0; text-align: left;">
                <a href="https://dawasnap.vercel.app" target="_blank" class="btn-action" style="background-color: #0f9d58; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; display: inline-block; box-shadow: 0 2px 4px rgba(15,157,88,0.2); box-sizing: border-box; text-align: center;">Open DawaSnap Vault</a>
              </div>
              
              <!-- Footer Info -->
              <p style="color: #94a3b8; font-size: 11px; margin: 20px 0 0 0; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                This automated safety alert was delivered by <strong>DawaSnap AI</strong> based on your scheduled alert policy (1 month, 7 days &amp; expired). You can customize or mute these notifications anytime in your account settings.
              </p>

            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
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
      from: "DawaSnap AI <alerts@noorpos.in>",
      to: [to],
      subject,
      text,
      html
    });

    if (error) {
      // Fallback domain
      const fallbackResult = await resend.emails.send({
        from: "DawaSnap AI <onboarding@resend.dev>",
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
