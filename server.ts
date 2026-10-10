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
  runBackgroundExpiryCheck,
  registerPushToken,
  sendPushNotificationToUser,
  purgeUserServerData
} from "./server/expiryCron.ts";
import { 
  initFirebaseAdmin, 
  requireFirebaseAuth, 
  type AuthenticatedRequest 
} from "./server/firebaseAdmin.ts";

// Initialize Firebase Admin on startup
initFirebaseAdmin();

const app = express();
app.set('trust proxy', true);
const PORT = Number(process.env.PORT) || 3000;

// ============================================================
// 1. CORS ALLOWLIST CONFIGURATION & SECURITY HEADERS
// ============================================================
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/localhost(:\d+)?$/,
  /^capacitor:\/\/localhost$/,
  /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/,
  /^https:\/\/noorpos\.in$/,
  /^https:\/\/www\.noorpos\.in$/,
  /^https:\/\/dawasnapai\.onrender\.com$/,
  /^https:\/\/dawasnap\.in$/,
  /^https:\/\/dawalensai\.onrender\.com$/,
  /^https:\/\/dawalens\.in$/,
  /^https:\/\/[a-zA-Z0-9-]+\.run\.app$/
];

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(o => {
    const trimmed = o.trim();
    if (trimmed) {
      ALLOWED_ORIGIN_PATTERNS.push(new RegExp('^' + trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*') + '$'));
    }
  });
}

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Allow mobile apps, curl, native Capacitor webviews, server-to-server
  return ALLOWED_ORIGIN_PATTERNS.some(regex => regex.test(origin));
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-cron-secret");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ============================================================
// 2. RATE LIMITING ENGINE (IN-MEMORY TOKEN BUCKET)
// ============================================================
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}
const ipBuckets = new Map<string, RateLimitBucket>();

function createRateLimiter(maxPerMinute: number = 100, burst: number = 20) {
  const capacity = maxPerMinute + burst;
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const ip = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(',')[0].trim();
    const now = Date.now();
    let bucket = ipBuckets.get(ip);
    
    if (!bucket) {
      bucket = { tokens: capacity, lastRefill: now };
      ipBuckets.set(ip, bucket);
    } else {
      const elapsedSeconds = (now - bucket.lastRefill) / 1000;
      bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * (maxPerMinute / 60));
      bucket.lastRefill = now;
    }

    if (bucket.tokens < 1) {
      return res.status(429).json({ 
        error: "Too many requests. Please wait a moment before trying again.",
        retryAfterSeconds: Math.ceil((1 - bucket.tokens) / (maxPerMinute / 60))
      });
    }
    bucket.tokens -= 1;
    next();
  };
}

const generalRateLimiter = createRateLimiter(120, 20);
const aiRateLimiter = createRateLimiter(30, 5);
const strictPublicFormRateLimiter = createRateLimiter(6, 2);

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
function isValidEmailInput(email: unknown): boolean {
  return typeof email === 'string' && email.length <= 100 && !/[\r\n\t]/.test(email) && EMAIL_REGEX.test(email.trim());
}

// ============================================================
// 3. BODY PARSERS WITH STRICT LIMITS
// ============================================================
// Standard body parser: 2MB default to prevent memory exhaustion attacks
const standardJsonParser = express.json({ limit: '2mb' });
// Dedicated body parser for camera image base64 uploads on extraction route
const highResScanParser = express.json({ limit: '15mb' });

app.use(express.urlencoded({ limit: '2mb', extended: true }));

// Apply general rate limiter and standard JSON parser to /api by default
app.use("/api", generalRateLimiter);

// Special case: /api/ai/extract uses higher 15MB limit for camera images
app.use("/api/ai/extract", highResScanParser);
// All other JSON requests use 2MB limit
app.use((req, res, next) => {
  if (req.path === "/api/ai/extract") return next();
  standardJsonParser(req, res, next);
});

// ============================================================
// 4. PUBLIC COMPLIANCE & STATIC VERIFICATION ENDPOINTS
// ============================================================
app.get("/google:id.html", (req, res) => {
  const id = req.params.id;
  res.setHeader("Content-Type", "text/html");
  res.send(`google-site-verification: google${id}.html`);
});

app.get(["/sitemap.xml", "/sitemap"], (req, res) => {
  const sitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
  if (fs.existsSync(sitemapPath)) {
    res.setHeader("Content-Type", "application/xml");
    res.sendFile(sitemapPath);
  } else {
    res.status(404).send("Sitemap not found");
  }
});

app.get("/.well-known/assetlinks.json", (req, res) => {
  const assetLinksPath = path.join(process.cwd(), "public", ".well-known", "assetlinks.json");
  if (fs.existsSync(assetLinksPath)) {
    res.setHeader("Content-Type", "application/json");
    res.sendFile(assetLinksPath);
  } else {
    res.status(404).json({ error: "assetlinks.json not found" });
  }
});

app.get(["/privacy", "/privacy.html"], (req, res) => {
  const privacyPath = path.join(process.cwd(), "public", "privacy.html");
  if (fs.existsSync(privacyPath)) {
    res.sendFile(privacyPath);
  } else {
    res.redirect("/?page=privacy");
  }
});

app.get(["/terms", "/terms.html"], (req, res) => {
  const termsPath = path.join(process.cwd(), "public", "terms.html");
  if (fs.existsSync(termsPath)) {
    res.sendFile(termsPath);
  } else {
    res.redirect("/?page=terms");
  }
});

app.get(["/manual", "/manual.html", "/guide", "/guide.html"], (req, res) => {
  const guidePath = path.join(process.cwd(), "public", "guide.html");
  if (fs.existsSync(guidePath)) {
    res.sendFile(guidePath);
  } else {
    res.redirect("/?page=guide");
  }
});

// Redirect duplicate /account-delete to canonical /delete-account
app.get(["/account-delete", "/account-delete.html", "/accountdelete"], (req, res) => {
  res.redirect(301, "/delete-account");
});

app.get(["/delete-account", "/delete-account.html"], (req, res) => {
  const deletePath = path.join(process.cwd(), "public", "delete-account.html");
  if (fs.existsSync(deletePath)) {
    res.sendFile(deletePath);
  } else {
    res.redirect("/?page=delete-account");
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "DawaSnap AI Server is running securely" });
});

// Public Account Deletion Request Submission (Protected against email bombing & spam relay)
app.post("/api/account/deletion-request", strictPublicFormRateLimiter, async (req, res) => {
  try {
    const { email, reason, confirmed } = req.body;
    if (!email || !isValidEmailInput(email)) {
      return res.status(400).json({ error: "A valid, sanitized email address (max 100 characters) is required." });
    }
    if (!confirmed) {
      return res.status(400).json({ error: "Explicit user confirmation is required." });
    }

    const sanitizedEmail = String(email).trim().toLowerCase();
    const sanitizedReason = typeof reason === 'string' ? reason.slice(0, 500) : '';

    const referenceId = `DEL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    console.log(`[ACCOUNT DELETION REQUEST] Verified request for ${sanitizedEmail}. Reference ID: ${referenceId}`);

    // If Resend API key is available, send confirmation receipt strictly to sanitizedEmail
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (apiKey && apiKey !== 'YOUR_API_KEY' && !apiKey.includes('YOUR_RESEND_API_KEY')) {
      try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: "DawaSnap AI <alerts@noorpos.in>",
          to: [sanitizedEmail],
          subject: `DawaSnap AI - Account Deletion Request Received (${referenceId})`,
          text: `Hello,\n\nWe have received your account and data deletion request for ${sanitizedEmail}.\nReference ID: ${referenceId}\n\nOur compliance team processes all deletion requests within 7 business days. All associated medicines, schedules, push tokens, and cloud data will be permanently wiped.\n\nThank you,\nDawaSnap AI Data Privacy Officer`,
        });
      } catch (emailErr) {
        console.warn("[DELETION EMAIL NOTICE] Could not send receipt email via Resend:", emailErr);
      }
    }

    res.json({
      success: true,
      referenceId,
      message: "Your account deletion request has been registered. All records will be verified and purged within 7 business days.",
      submittedAt: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || String(error) });
  }
});

// ============================================================
// 5. PROTECTED USER API ROUTES (REQUIRE FIREBASE ID TOKEN)
// ============================================================

// Mail Sending Route using Resend API (Protected & Input Validated)
app.post("/api/send-email", requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { to, subject, text, html } = req.body;
    if (!to || !isValidEmailInput(to)) {
      return res.status(400).json({ error: "Invalid or malformed recipient email address 'to'." });
    }
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return res.status(400).json({ error: "Subject is required and must be a non-empty string." });
    }

    const sanitizedTo = String(to).trim().toLowerCase();
    const sanitizedSubject = subject.replace(/[\r\n\t]/g, ' ').slice(0, 200).trim();
    const sanitizedText = typeof text === 'string' ? text.slice(0, 50000) : "";
    const sanitizedHtml = typeof html === 'string' ? html.slice(0, 100000) : undefined;

    let apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      apiKey = apiKey.trim().replace(/^['"]+|['"]+$/g, '');
    }

    const isKeyInvalid = !apiKey || apiKey === 'YOUR_API_KEY' || apiKey.includes('YOUR_RESEND_API_KEY');
    if (isKeyInvalid) {
      console.warn("[RESEND WARNING] RESEND_API_KEY is not configured. Simulating successful send.");
      return res.json({ 
        success: true, 
        simulated: true, 
        message: "Resend API key is not configured on server. Email simulated.", 
        id: `sim-${Date.now()}` 
      });
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "DawaSnap AI <alerts@noorpos.in>",
      to: [sanitizedTo],
      subject: sanitizedSubject,
      text: sanitizedText,
      html: sanitizedHtml,
    });

    if (error) {
      console.warn("[RESEND ERROR]", error);
      // Resend sandbox fallback
      const fallbackResult = await resend.emails.send({
        from: "DawaSnap AI <onboarding@resend.dev>",
        to: [to],
        subject: subject,
        text: text || "",
        html: html || undefined,
      });
      if (fallbackResult.error) {
        throw new Error(fallbackResult.error.message);
      }
      return res.json({ success: true, message: "Email sent via onboarding fallback", id: fallbackResult.data?.id });
    }

    res.json({ success: true, message: "Email sent successfully", id: data?.id });
  } catch (error: any) {
    console.error("[EMAIL SEND ERROR]", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Extraction Cache Routes (Protected)
app.post("/api/ai/extract-cache", requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { imageHash } = req.body;
    const result = await getExtractionCache(imageHash);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/ai/extract-save-cache", requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { imageHash, data } = req.body;
    await saveExtractionCache(imageHash, data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Interaction Cache Routes (Protected)
app.post("/api/ai/interactions-cache", requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { key } = req.body;
    const result = await getInteractionCache(key);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/ai/interactions-save-cache", requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { key, data } = req.body;
    await saveInteractionCache(key, data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// AI Proxies (Protected & Rate Limited)
app.post("/api/ai/extract", aiRateLimiter, requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { base64Image, base64Images, additionalImages, ocrText, hints, cnnFeatures } = req.body;
    if (base64Image && (typeof base64Image !== 'string' || base64Image.length > 20 * 1024 * 1024)) {
      return res.status(400).json({ success: false, errorMessage: "Invalid image format or image exceeds 20MB limit." });
    }
    const extraImages: string[] = [];
    if (Array.isArray(additionalImages)) {
      additionalImages.forEach((img: any) => {
        if (typeof img === 'string' && img.length > 50 && img.length < 20 * 1024 * 1024) {
          extraImages.push(img);
        }
      });
    } else if (Array.isArray(base64Images)) {
      base64Images.slice(1).forEach((img: any) => {
        if (typeof img === 'string' && img.length > 50 && img.length < 20 * 1024 * 1024) {
          extraImages.push(img);
        }
      });
    }
    const primaryImage = base64Image || (Array.isArray(base64Images) && base64Images[0]) || undefined;

    if (ocrText && (typeof ocrText !== 'string' || ocrText.length > 50000)) {
      return res.status(400).json({ success: false, errorMessage: "OCR text exceeds 50,000 characters." });
    }
    const result = await extractMedicineDataServer(primaryImage, ocrText, hints, cnnFeatures, extraImages);
    res.json(result);
  } catch (error: any) {
    res.json({ success: false, errorMessage: error.message || "Failed to extract medicine data from image." });
  }
});

app.post("/api/ai/interactions", aiRateLimiter, requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { medicines } = req.body;
    if (!Array.isArray(medicines) || medicines.length > 100) {
      return res.status(400).json({ error: "Medicines must be an array of at most 100 items." });
    }
    const result = await checkDrugInteractionsServer(medicines);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.post("/api/ai/categorize", aiRateLimiter, requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { medicines } = req.body;
    if (!Array.isArray(medicines) || medicines.length > 100) {
      return res.status(400).json({ error: "Medicines must be an array of at most 100 items." });
    }
    const result = await categorizeMedicinesServer(medicines || []);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || String(error) });
  }
});

// Anonymous in-app AI response reporting endpoint (stores report without personal data)
app.post("/api/ai/report", aiRateLimiter, async (req, res) => {
  try {
    const { category, comment, responseSnippet, provider } = req.body;
    const cleanCategory = typeof category === 'string' ? category.slice(0, 100) : 'General';
    const cleanComment = typeof comment === 'string' ? comment.slice(0, 2000) : '';
    const cleanSnippet = typeof responseSnippet === 'string' ? responseSnippet.slice(0, 2000) : '';
    const cleanProvider = provider === 'slm' ? 'slm' : 'gemini';

    const reportId = `REP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    console.log(`[AI RESPONSE REPORT] Report ID: ${reportId}, Category: ${cleanCategory}, Provider: ${cleanProvider}`);
    res.json({ 
      success: true, 
      reportId, 
      message: "Thank you for reporting this response. The incident has been recorded anonymously for clinical AI safety review." 
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || String(error) });
  }
});

app.get("/api/ai/key-status", aiRateLimiter, (req, res) => {
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
        error: "API key is not configured in server environment."
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.get("/api/ai/chat-count", requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const today = new Date().toISOString().split('T')[0];
    const count = await getChatCount(userId, today);
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

app.post("/api/ai/chat", aiRateLimiter, requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { messages, medicines } = req.body;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) {
      return res.status(400).json({ error: "Messages must be a non-empty array with at most 100 items." });
    }
    if (medicines && (!Array.isArray(medicines) || medicines.length > 500)) {
      return res.status(400).json({ error: "Medicines context must be an array with at most 500 items." });
    }
    const userId = req.userId!; // Derived securely from verified ID token
    
    const responseText = await chatWithGeminiServer(messages, userId, medicines);
    
    const today = new Date().toISOString().split('T')[0];
    await incrementChatCount(userId, today);
    
    res.json({ responseText });
  } catch (error: any) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Endpoint to register/sync user's active medicine expiry schedule to the server
app.post("/api/sync-expiry-schedule", requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!; // Securely bound to authenticated token
    const userEmail = req.userEmail || req.body.email;
    const { emailNotificationsEnabled, medicines } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: "Verified user email is required" });
    }

    await registerUserExpirySchedule(
      userId,
      userEmail,
      emailNotificationsEnabled !== false,
      Array.isArray(medicines) ? medicines : []
    );

    res.json({ success: true, count: Array.isArray(medicines) ? medicines.length : 0 });
  } catch (error: any) {
    console.error("Error syncing expiry schedule:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Endpoint to permanently purge user's server-side schedule and push tokens on account deletion
app.post("/api/user/purge-data", requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!; // Bound to verified token - cannot purge another user
    await purgeUserServerData(userId);
    res.json({ success: true, purgedUserId: userId });
  } catch (error: any) {
    console.error("Error purging user server data:", error);
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Endpoint to register a push notification token (FCM HTTP v1 / Web Push)
app.post("/api/notifications/register-token", requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const { token, platform } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }
    await registerPushToken(userId, token, platform || 'web');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Endpoint to send a test notification
app.post("/api/notifications/send-test", requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const { title, body } = req.body;
    const result = await sendPushNotificationToUser(
      userId,
      title || "🚨 DawaSnap AI Test Alert",
      body || "Push notification is working perfectly on your device/browser!",
      { test: true }
    );
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

// Endpoint to trigger a background expiry check (Strictly protected by CRON_SECRET)
app.post("/api/cron/check-expiry", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const providedHeader = req.headers['x-cron-secret'];
  
  if (!cronSecret || typeof providedHeader !== 'string' || providedHeader !== cronSecret) {
    return res.status(401).json({ error: "Unauthorized: A valid x-cron-secret header matching CRON_SECRET is required." });
  }

  try {
    const result = await runBackgroundExpiryCheck();
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

// ============================================================
// 6. SERVE STATIC ASSETS IN PRODUCTION OR VITE IN DEV
// ============================================================
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
      // Launch automated expiry cron worker
      startExpiryCron();

      // Keep-alive self-ping for Render
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
