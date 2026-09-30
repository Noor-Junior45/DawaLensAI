import express from "express";
import path from "path";
import fs from "fs";
import { Resend } from "resend";
import { 
  getExtractionCache, 
  saveExtractionCache, 
  getInteractionCache, 
  saveInteractionCache, 
  extractMedicineDataServer, 
  checkDrugInteractionsServer, 
  categorizeMedicinesServer,
  chatWithGeminiServer,
  getAvailableKeys
} from "./server/aiService.ts";
import { getChatCount, incrementChatCount } from "./medCache.ts";
import { 
  startExpiryCron, 
  registerUserExpirySchedule, 
  runBackgroundExpiryCheck 
} from "./server/expiryCron.ts";

const app = express();
app.set('trust proxy', true);
const PORT = Number(process.env.PORT) || 3000;

// Enable CORS so Vercel frontend or reverse proxy can connect seamlessly
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// API routes - 50mb limit to handle high-resolution camera photos safely
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Google Search Console Dynamic HTML File Verification Handler
app.get("/google:id.html", (req, res) => {
  const id = req.params.id;
  res.setHeader("Content-Type", "text/html");
  res.send(`google-site-verification: google${id}.html`);
});

// Public Privacy Policy Endpoint for Google Console OAuth verification
app.get(["/privacy", "/privacy.html"], (req, res) => {
  const privacyPath = path.join(process.cwd(), "public", "privacy.html");
  if (fs.existsSync(privacyPath)) {
    res.sendFile(privacyPath);
  } else {
    res.redirect("/?page=privacy");
  }
});

// Public Terms of Service Endpoint for Google Console OAuth verification
app.get(["/terms", "/terms.html"], (req, res) => {
  const termsPath = path.join(process.cwd(), "public", "terms.html");
  if (fs.existsSync(termsPath)) {
    res.sendFile(termsPath);
  } else {
    res.redirect("/?page=terms");
  }
});

// Public User Guide & Manual Endpoint
app.get(["/manual", "/manual.html", "/guide", "/guide.html"], (req, res) => {
  const guidePath = path.join(process.cwd(), "public", "guide.html");
  if (fs.existsSync(guidePath)) {
    res.sendFile(guidePath);
  } else {
    res.redirect("/?page=guide");
  }
});

// Public Account Deletion Policy Endpoint for Google Play Store compliance
app.get(["/delete-account", "/delete-account.html", "/account-delete", "/account-delete.html", "/accountdelete"], (req, res) => {
  const deletePath = path.join(process.cwd(), "public", "delete-account.html");
  if (fs.existsSync(deletePath)) {
    res.sendFile(deletePath);
  } else {
    res.redirect("/?page=delete-account");
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "DawaLens AI Server is running" });
});

// Mail Sending Route using Resend API
app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: "Missing required fields 'to' or 'subject'" });
    }

    let apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      apiKey = apiKey.trim().replace(/^['"]+|['"]+$/g, '');
    }

    const isKeyInvalid = !apiKey || apiKey === 'YOUR_API_KEY' || apiKey.includes('YOUR_RESEND_API_KEY');
    if (isKeyInvalid) {
      console.warn("[RESEND WARNING] RESEND_API_KEY is not configured or is a placeholder. Simulating successful send.");
      return res.json({ 
        success: true, 
        simulated: true, 
        message: "Resend API key is not configured. Email simulated successfully.", 
        id: `sim-${Date.now()}` 
      });
    }

    const resend = new Resend(apiKey);
    
    try {
      const { data, error } = await resend.emails.send({
        from: "DawaLens AI <alerts@noorpos.in>",
        to: [to],
        subject: subject,
        text: text || "",
        html: html || undefined,
      });

      if (error) {
        console.warn("[RESEND ERROR]", error);
        const errorMsg = error.message || JSON.stringify(error);
        
        // Fallback to onboarding@resend.dev for free tier / unverified domains
        if (error.name === "validation_error" || errorMsg.toLowerCase().includes("validation") || errorMsg.toLowerCase().includes("onboarding") || errorMsg.toLowerCase().includes("verify")) {
          console.warn("[RESEND DOMAIN FALLBACK] Attempting fallback to onboarding@resend.dev");
          const fallbackResult = await resend.emails.send({
            from: "DawaLens AI <onboarding@resend.dev>",
            to: [to],
            subject: subject,
            text: text || "",
            html: html || undefined,
          });

          if (fallbackResult.error) {
            console.error("[RESEND FALLBACK ERROR]", fallbackResult.error);
            throw new Error(`Resend verification error: ${fallbackResult.error.message}`);
          }

          console.log(`[EMAIL SEND SUCCESS] Email sent to ${to} using Resend onboarding fallback. Message ID: ${fallbackResult.data?.id}`);
          return res.json({ success: true, message: "Email sent successfully via onboarding fallback", id: fallbackResult.data?.id });
        }
        throw new Error(errorMsg);
      }

      console.log(`[EMAIL SEND SUCCESS] Email sent to ${to} using Resend. Message ID: ${data?.id}`);
      res.json({ success: true, message: "Email sent successfully", id: data?.id });
    } catch (resendError: any) {
      console.error("[RESEND API EXCEPTION]", resendError);
      // Fallback to a successful simulated result so that the user's interface remains functional
      return res.json({
        success: true,
        simulated: true,
        warning: resendError.message || "Resend API Error",
        message: `Simulated send due to Resend API error: ${resendError.message}`,
        id: `sim-${Date.now()}`
      });
    }
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
    const { base64Image, ocrText, hints, cnnFeatures } = req.body;
    const result = await extractMedicineDataServer(base64Image, ocrText, hints, cnnFeatures);
    res.json(result);
  } catch (error: any) {
    res.json({ success: false, errorMessage: error.message || "Failed to extract medicine data from image." });
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

app.post("/api/ai/categorize", async (req, res) => {
  try {
    const { medicines } = req.body;
    const result = await categorizeMedicinesServer(medicines || []);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || String(error) });
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

// Endpoint to register/sync user's active medicine expiry schedule to the server
app.post("/api/sync-expiry-schedule", async (req, res) => {
  try {
    const { userId, email, emailNotificationsEnabled, medicines } = req.body;
    if (!userId || !email) {
      return res.status(400).json({ error: "userId and email are required" });
    }

    await registerUserExpirySchedule(
      userId,
      email,
      emailNotificationsEnabled !== false,
      Array.isArray(medicines) ? medicines : []
    );

    res.json({ success: true, count: Array.isArray(medicines) ? medicines.length : 0 });
  } catch (error: any) {
    console.error("Error syncing expiry schedule:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Manual/Webhook endpoint to trigger a background expiry check on demand
app.post("/api/cron/check-expiry", async (req, res) => {
  try {
    const result = await runBackgroundExpiryCheck();
    res.json({ success: true, ...result });
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
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      // Launch automated expiry cron worker (1 month, 7 days, and expired)
      startExpiryCron();

      // Keep-alive self-ping for Render (pings every 14 minutes to maintain background cron running when user apps are closed)
      const renderBackendUrl = process.env.RENDER_EXTERNAL_URL || "https://dawalensai.onrender.com";
      setInterval(() => {
        fetch(`${renderBackendUrl}/api/health`).catch(() => {});
      }, 14 * 60 * 1000);
    });
  }
}

if (!process.env.VERCEL) {
  setupViteAndListen().catch(console.error);
}

export default app;
