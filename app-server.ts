import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import { 
  getExtractionCache, 
  saveExtractionCache, 
  getInteractionCache, 
  saveInteractionCache, 
  extractMedicineDataServer, 
  checkDrugInteractionsServer, 
  chatWithGeminiServer,
  getAvailableKeys
} from "./server/aiService";
import { getChatCount, incrementChatCount } from "./medCache";

let transporterInstance: any = null;

function getGmailCredentials() {
  const userKeys = [
    "GMAIL_USER",
    "GAMIL_USER",
    "EMAIL_USER",
    "GMAIL_USERNAME",
    "GAMIL_USERNAME",
    "EMAIL_USERNAME",
    "SENDER_EMAIL"
  ];
  
  const passKeys = [
    "GMAIL_APP_PASSWORD",
    "GAMIL_APP_PASSWORD",
    "GMAIL_PASSWORD",
    "GAMIL_PASSWORD",
    "EMAIL_PASSWORD",
    "GMAIL_APP_PASS",
    "GAMIL_APP_PASS",
    "GMAIL_PASS",
    "GAMIL_PASS",
    "EMAIL_PASS",
    "APP_PASSWORD"
  ];

  let user = "";
  let resolvedUserKey = "NONE";
  for (const key of userKeys) {
    if (process.env[key]) {
      const val = process.env[key]!.trim();
      if (val && val !== "YOUR_GMAIL_EMAIL" && val !== "your_email@gmail.com") {
        user = val.replace(/['"]+/g, "").trim();
        resolvedUserKey = key;
        break;
      }
    }
  }

  let cleanPass = "";
  let resolvedPassKey = "NONE";
  for (const key of passKeys) {
    if (process.env[key]) {
      const val = process.env[key]!.trim();
      if (val && val !== "YOUR_GMAIL_APP_PASSWORD" && val !== "your_app_password_here") {
        cleanPass = val.replace(/['"]+/g, "").replace(/\s+/g, "").trim();
        resolvedPassKey = key;
        break;
      }
    }
  }

  // Fall back to working user credentials if not configured in the environment
  if (!user) {
    user = "noorpos.alerts@gmail.com";
    resolvedUserKey = "HARDCODED_FALLBACK";
  }
  if (!cleanPass) {
    cleanPass = "wrieavyseptoednt";
    resolvedPassKey = "HARDCODED_FALLBACK";
  }

  return { 
    user, 
    cleanPass, 
    resolvedUserKey, 
    resolvedPassKey, 
    originalPass: cleanPass 
  };
}

function getTransporter() {
  if (transporterInstance) return transporterInstance;
  
  const { user, cleanPass, resolvedUserKey, resolvedPassKey } = getGmailCredentials();
  
  if (!cleanPass || cleanPass === "YOUR_GMAIL_APP_PASSWORD") {
    console.warn(`[NODEMAILER] No valid GMAIL_APP_PASSWORD found. Checked keys: GMAIL_APP_PASSWORD, GAMIL_APP_PASSWORD, etc. Using fallback mode.`);
    return null;
  }
  
  const maskedPass = cleanPass.length > 6 
    ? cleanPass.substring(0, 3) + "..." + cleanPass.slice(-3) 
    : "***";
  console.log(`[EMAIL TRANSPORTER DEBUG] Initializing transporter for "${user}" (from env key "${resolvedUserKey}") with password length ${cleanPass.length} (from env key "${resolvedPassKey}") (Masked: ${maskedPass})`);
  
  transporterInstance = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: cleanPass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  return transporterInstance;
}

const app = express();
app.set('trust proxy', true);
const PORT = 3000;

// API routes
app.use(express.json({ limit: '10mb' }));

  // Google Search Console Dynamic HTML File Verification Handler
  app.get("/google:id.html", (req, res) => {
    const id = req.params.id;
    res.setHeader("Content-Type", "text/html");
    res.send(`google-site-verification: google${id}.html`);
  });

  // Public Privacy Policy Endpoint for Google Console OAuth verification
  app.get("/privacy", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - DawaLens AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { border-b: 2px solid #eaeaea; padding-bottom: 10px; color: #111; }
    h2 { color: #222; margin-top: 30px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 14px; }
    footer { margin-top: 50px; border-top: 1px solid #eaeaea; padding-top: 20px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <h1>Privacy Policy for DawaLens AI</h1>
  <p><strong>Effective Date: June 25, 2026</strong></p>
  <p>Welcome to DawaLens AI. We are dedicated to protecting your personal information and your right to privacy. This privacy policy applies to our application hosted at <strong>https://noorpos.in</strong> and <strong>https://dawalens.vercel.app</strong>.</p>
  
  <h2>1. What Information We Access and How We Use It</h2>
  <p>DawaLens AI is an AI-powered medication scanner and scheduler designed to assist you in organizing your personal medical reminders.</p>
  <ul>
    <li><strong>Google OAuth and Google Tasks Integration:</strong> If you connect your Google Account, we request access to the Google Tasks API (<code>https://www.googleapis.com/auth/tasks</code>). This is used strictly to sync, create, edit, or check off your medication schedules and alarm events as tasks inside your Google account. We do NOT store or compile profiles of your task lists on our servers, nor do we share this data with any third parties.</li>
    <li><strong>Medicines & Prescriptions Data:</strong> Any medicine name, dosage, or scheduling frequency you input or scan is saved securely inside your private cloud database (Firebase).</li>
    <li><strong>Zero-Knowledge End-to-End Encryption (E2EE):</strong> You have the option to enable E2EE. When enabled, your medical inputs are encrypted locally in your browser using the Web Crypto API before being transmitted to the cloud database. We do not hold your decryption keys and cannot read your encrypted records under any circumstances.</li>
  </ul>

  <h2>2. Google User Data Policy Compliance</h2>
  <p>Our application strictly complies with the <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements. We do not transfer, sell, or disclose your Google User data to marketing networks, data brokers, or third-party advertising platforms.</p>

  <h2>3. Contact Us</h2>
  <p>If you have any questions, feedback, or concerns regarding your privacy or data protection practices, feel free to contact us at:</p>
  <p>Email: <a href="mailto:noorpos.alerts@gmail.com">noorpos.alerts@gmail.com</a></p>
  
  <footer>
    <p>&copy; 2026 DawaLens AI. All rights reserved. Host: https://noorpos.in</p>
  </footer>
</body>
</html>`);
  });

  // Public Terms of Service Endpoint for Google Console OAuth verification
  app.get("/terms", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service - DawaLens AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { border-b: 2px solid #eaeaea; padding-bottom: 10px; color: #111; }
    h2 { color: #222; margin-top: 30px; }
    footer { margin-top: 50px; border-top: 1px solid #eaeaea; padding-top: 20px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <h1>Terms of Service for DawaLens AI</h1>
  <p><strong>Effective Date: June 25, 2026</strong></p>
  <p>These Terms of Service govern your use of the website and services at <strong>https://noorpos.in</strong> and <strong>https://dawalens.vercel.app</strong>. By accessing our application, you agree to these terms.</p>

  <h2>1. Description of Service</h2>
  <p>DawaLens AI provides medication barcode/label scanning, scheduling, and smart drug-interaction checking using AI technology. These features are designed strictly for educational and personal organization purposes.</p>

  <h2>2. Medical Disclaimer</h2>
  <p><strong>DawaLens AI is NOT a clinical tool, medical device, or licensed medical professional.</strong> Our features (including AI summaries and drug interaction warnings) are generated by general artificial intelligence models and are subject to errors. Never change, delay, or start medical treatment without directly consulting your doctor or pharmacist.</p>

  <h2>3. Third Party Services</h2>
  <p>To deliver advanced reminders, you may voluntarily grant authorization to Google Tasks. You acknowledge that Google's own terms and policies govern their services.</p>

  <h2>4. Privacy & Personal Data</h2>
  <p>We respect your privacy. All handling of user inputs is done in accordance with our <a href="/privacy">Privacy Policy</a>.</p>

  <h2>5. Limitation of Liability</h2>
  <p>DawaLens AI is provided "as is" without any guarantees. We are not responsible for any issues resulting from missed doses, data sync failures, or information accuracy errors.</p>

  <h2>6. Governing Law & Contact</h2>
  <p>For any questions or legal inquiries, please contact us at:</p>
  <p>Email: <a href="mailto:noorpos.alerts@gmail.com">noorpos.alerts@gmail.com</a></p>

  <footer>
    <p>&copy; 2026 DawaLens AI. All rights reserved. Host: https://noorpos.in</p>
  </footer>
</body>
</html>`);
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "DawaLens AI Server is running" });
  });

  // Mail Sending Route (Nodemailer) using noorpos.alerts@gmail.com
  app.post("/api/send-email", async (req, res) => {
    try {
      const { to, subject, text, html } = req.body;
      if (!to || !subject) {
        return res.status(400).json({ error: "Missing required fields 'to' or 'subject'" });
      }

      const { user: fromEmail, cleanPass, resolvedUserKey, resolvedPassKey } = getGmailCredentials();

      if (!cleanPass || cleanPass === "YOUR_GMAIL_APP_PASSWORD") {
        console.warn(`[EMAIL NODEMAILER FALLBACK] Simulated sending email to ${to} since GMAIL_APP_PASSWORD is not set. (Checked user key: ${resolvedUserKey}, pass key: ${resolvedPassKey})`);
        return res.json({ 
          success: true, 
          simulated: true, 
          message: `Email dispatch simulated successfully (configure GMAIL_APP_PASSWORD for real sending). Checked env keys: user=${resolvedUserKey}, pass=${resolvedPassKey}.` 
        });
      }

      const mailOptions = {
        from: `"DawaLens AI Alert" <${fromEmail}>`,
        to,
        subject,
        text,
        html
      };

      // Try sending with different transport options to bypass serverless constraints or dynamic blocks
      let lastError: any = null;
      let sentSuccessfully = false;

      const configs = [
        { name: "Gmail Service (Recommended)", service: "gmail" },
        { name: "Custom SMTP Port 465", host: "smtp.gmail.com", port: 465, secure: true },
        { name: "Custom SMTP Port 587", host: "smtp.gmail.com", port: 587, secure: false }
      ];

      const maskedPass = cleanPass.length > 6 
        ? cleanPass.substring(0, 3) + "..." + cleanPass.slice(-3) 
        : "***";
      console.log(`[EMAIL CREDENTIAL DEBUG] Trying authentication for "${fromEmail}" (from env "${resolvedUserKey}") with password length ${cleanPass.length} (from env "${resolvedPassKey}") (Masked: ${maskedPass})`);

      for (let attempt = 0; attempt < configs.length; attempt++) {
        const config = configs[attempt];
        try {
          console.log(`[EMAIL SEND] Attempt ${attempt + 1}: trying ${config.name} with user: ${fromEmail}...`);
          
          let transporter;
          if ('service' in config) {
            transporter = nodemailer.createTransport({
              service: config.service,
              auth: {
                user: fromEmail,
                pass: cleanPass
              },
              tls: {
                rejectUnauthorized: false
              }
            });
          } else {
            transporter = nodemailer.createTransport({
              host: config.host,
              port: config.port,
              secure: config.secure,
              auth: {
                user: fromEmail,
                pass: cleanPass
              },
              connectionTimeout: 10000,
              greetingTimeout: 10000,
              socketTimeout: 15000,
              tls: {
                rejectUnauthorized: false
              }
            });
          }

          await transporter.sendMail(mailOptions);
          console.log(`[EMAIL SEND SUCCESS] Email sent to ${to} on attempt ${attempt + 1} (${config.name})`);
          sentSuccessfully = true;
          break;
        } catch (error: any) {
          console.warn(`[EMAIL SEND WARN] Attempt ${attempt + 1} (${config.name}) failed: ${error.message || String(error)}`);
          lastError = error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!sentSuccessfully) {
        const errMessage = lastError ? (lastError.message || String(lastError)) : "Unknown email error";
        throw new Error(
          `${errMessage}. Diagnostics: Checked user key: "${resolvedUserKey}" (${fromEmail}), password key: "${resolvedPassKey}" (length: ${cleanPass.length}). ` +
          "Note: Gmail SMTP requires 2FA enabled on your Google Account and generating a 16-character 'App Password' under Security settings. Standard passwords will fail."
        );
      }

      res.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
      console.error("[EMAIL SEND ERROR]", error);
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  // Extraction Cache Routes
  app.post("/api/ai/extract-cache", async (req, res) => {
    try {
      const { imageHash } = req.body;
      const result = await getExtractionCache(imageHash);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/ai/extract-save-cache", async (req, res) => {
    try {
      const { imageHash, data } = req.body;
      await saveExtractionCache(imageHash, data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Interaction Cache Routes
  app.post("/api/ai/interactions-cache", async (req, res) => {
    try {
      const { key } = req.body;
      const result = await getInteractionCache(key);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/ai/interactions-save-cache", async (req, res) => {
    try {
      const { key, data } = req.body;
      await saveInteractionCache(key, data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Actual Gemini API Proxies
  app.post("/api/ai/extract", async (req, res) => {
    try {
      const { base64Image } = req.body;
      const result = await extractMedicineDataServer(base64Image);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, errorMessage: error.message || String(error) });
    }
  });

  app.post("/api/ai/interactions", async (req, res) => {
    try {
      const { medicines } = req.body;
      const result = await checkDrugInteractionsServer(medicines);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  app.get("/api/ai/key-status", async (req, res) => {
    try {
      const keys = getAvailableKeys();
      if (keys.length > 0) {
        return res.json({ 
          hasKey: true, 
          count: keys.length,
          checkedAt: new Date().toLocaleTimeString()
        });
      } else {
        return res.json({ 
          hasKey: false, 
          count: 0,
          checkedAt: new Date().toLocaleTimeString(),
          error: "API key is missing on Vercel environment variables."
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  app.get("/api/ai/chat-count", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: "userId is required" });
      }
      const today = new Date().toISOString().split('T')[0];
      const count = await getChatCount(userId, today);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, userId, medicines } = req.body;
      
      if (userId) {
        const today = new Date().toISOString().split('T')[0];
        const currentCount = await getChatCount(userId, today);
        
        if (currentCount >= 10) {
          return res.status(429).json({ 
            error: "You have reached your daily limit of 10 chats. Please come back tomorrow to continue your consultation with Dr. DawaLens!" 
          });
        }
      }
      
      const responseText = await chatWithGeminiServer(messages, userId, medicines);
      
      if (userId) {
        const today = new Date().toISOString().split('T')[0];
        await incrementChatCount(userId, today);
      }
      
      res.json({ responseText });
    } catch (error: any) {
      res.status(500).json({ error: error.message || String(error) });
    }
  });

  // Serve static assets in production or dynamic Vite in development
  async function setupViteAndListen() {
    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  }

  setupViteAndListen().catch(console.error);

  export default app;
