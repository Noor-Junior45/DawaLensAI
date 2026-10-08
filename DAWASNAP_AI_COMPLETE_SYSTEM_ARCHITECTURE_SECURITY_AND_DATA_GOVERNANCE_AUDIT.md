# DawaSnap AI — Complete System Architecture, Security & Data Governance Audit
**Document Identifier:** `DAWASNAP-AUDIT-2026-V1.0`  
**Classification:** Public Disclosure, App Review, Due Diligence & Buyer Documentation  
**Effective Date:** October 3, 2026  
**Application Identity:** DawaSnap AI (Android Package: `in.dawasnap.app` & Web App: `https://dawasnap.vercel.app`)  
**Data Controller / Operating Developer:** MD NOOR HASSAN (`newluckypharmacy@gmail.com`)  
**Applicable Legal Frameworks:** Google Play Store Health & Medical Apps Policy, Google API Services User Data Policy (Limited Use), India Digital Personal Data Protection (DPDP) Act 2023, EU General Data Protection Regulation (GDPR 2016/679).

---

## 1. Executive Overview & Product Architecture

### 1.1 Product Purpose & Value Proposition
DawaSnap AI is an intelligent pharmaceutical management, expiration monitoring, and medication safety companion. It allows patients, families, and caregivers to:
- Digitize medicine cabinets and prescription packages using intelligent camera scanning (multimodal optical character recognition and visual form classification).
- Maintain an encrypted, cross-device synchronized inventory of active medications with dosage forms, strength, remaining quantities, and batch expiry dates.
- Receive multi-stage safety notifications before medications expire (at 30 days, 7 days, and on the date of expiration with safe chemical disposal advisories).
- Screen multiple concurrent medications for known drug-drug interactions, contraindications, and clinical safety warnings.
- Consult an interactive AI Pharmacist ("Dr. DawaSnap") using a hybrid intelligence framework (cloud clinical reasoning via Gemini 2.5 Flash and 100% offline on-device inference via a Small Language Model).

### 1.2 Technology Stack Blueprint
```
+---------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                        |
|  - Native Android (Capacitor 8 Container / Kotlin Bridge / AndroidBridge ML Kit)      |
|  - Progressive Web Application (Vite 6 + React 19 + TypeScript + Tailwind CSS v4)    |
|  - Local Storage Engines: Sandboxed IndexedDB (Images) + Web Storage (Theme/Prefs)     |
|  - On-Device Intelligence: Tesseract.js (Wasm) + Custom CNN + 2.1M Param Clinical SLM |
+---------------------------------------------------------------------------------------+
                                  │                ▲
                HTTPS / TLS 1.3   │                │ Web Push / FCM
                                  ▼                │
+---------------------------------------------------------------------------------------+
|                                   BACKEND TIER                                        |
|  - Node.js & Express 4 Runtime (Vercel Serverless Gateway & Render Cloud Daemon)       |
|  - Endpoints: /api/ai/extract, /api/ai/chat, /api/ai/interactions, /api/send-email     |
|  - Automated 24/7 Expiry Cron Worker (server/expiryCron.ts - hourly background check) |
|  - Single Canonical Google AI Studio Key Manager (Rotation & Resilient Model Fallbacks)|
+---------------------------------------------------------------------------------------+
                                  │                │
            Server-to-Server HTTPS│                │ Firebase Admin / REST
                                  ▼                ▼
+---------------------------------------------------------------------------------------+
|                             CLOUD INFRASTRUCTURE TIER                                 |
|  - Google Cloud Platform & Firebase: Authentication + Cloud Firestore NoSQL DB        |
|  - Google AI Studio: Gemini 2.5 Flash, Gemini 3.8 Flash (Multimodal OCR & Pharmacist) |
|  - Google Firebase Cloud Messaging (FCM): Push Notification Gateway                   |
|  - Resend Inc.: Transactional SMTP Delivery (alerts@noorpos.in / onboarding@resend.dev)|
|  - Firebase Crashlytics: Native Crash & Uncaught Exception Reporting                  |
+---------------------------------------------------------------------------------------+
```

---

## 2. Complete Data Flow & Service Inventory

The application interfaces strictly with vetted, enterprise-grade cloud providers bound by Data Processing Agreements (DPAs), SOC 2 Type II, ISO 27001, and GDPR compliance standards:

| Provider & Service | Architectural Role | Data Sent / Handled | Privacy & Security Controls |
| :--- | :--- | :--- | :--- |
| **Google Firebase Auth** | User authentication & account management | Email address, hashed password (email/password auth) OR Google OpenID profile (name, email, profile photo URL). | Encrypted in transit (TLS 1.3) and at rest. Strict OAuth limited use. Tokens never exposed to third parties. |
| **Google Cloud Firestore** | Cloud database for cross-device synchronization | Medication records, dosages, expiry dates, quantities, dose history logs, user UI settings, mail history. | Sandboxed per-user via `firestore.rules`. Zero cross-user read/write permissions. Encrypted at rest (AES-256). |
| **Google AI Studio (Gemini 2.5 Flash)** | Multimodal OCR, drug interactions, clinical triage | In scan mode: Base64 medicine packaging photo + local OCR text fragments. In chat mode: De-identified chat turns + active medicine list. | Zero PII transmitted (no name, email, or user UID). Processed in server memory; zero image persistence on server disks. |
| **Firebase Cloud Messaging (FCM)** | Automated expiration push notifications | FCM Device Registration Token, notification title, expiry warning body. | Encrypted token storage (`user_push_tokens`). Zero promotional push notifications. |
| **Resend Inc.** | Transactional expiration & low-stock alerts | Recipient email address, medicine brand name, dosage, expiration date, disposal safety tips. | TLS encrypted delivery. Direct DKIM/SPF authenticated domain (`noorpos.in`). Logs retained ephemerally for delivery status. |
| **Firebase Crashlytics** | Native Android stability monitoring | Stack traces, device model, Android OS version, Firebase Auth UID string. | Zero health data, zero medicine names, zero prescription photos attached. IP anonymization enabled. |
| **Client-Side IndexedDB** | Local medicine packaging photo storage | Base64-encoded medicine packaging photographs taken by user camera. | 100% sandboxed inside client browser/device storage (`DawaSnapLocalImages`). Never uploaded to Firebase Storage or cloud databases. |

---

## 3. 🔴 AREA 1 — OCR & Medicine Image Data Flow Report

### 3.1 Step-by-Step Data Flow
1. **Camera Capture (`src/components/CameraCapture.tsx`)**:
   - The user triggers the native device camera or HTML5 video feed.
   - The frame is captured onto an in-memory HTML5 Canvas and converted to a JPEG Base64 string.
2. **On-Device Pre-Processing (`src/services/ocrService.ts`)**:
   - The image is processed in RAM (downscaled to a maximum dimension of 1200px and converted to grayscale with adaptive contrast curves to eliminate shiny blister foil glare).
3. **Local Text & Pattern Recognition**:
   - The app attempts recognition in three tiers:
     - Tier 1: Native Android Bridge / ML Kit (if running in custom Android container).
     - Tier 2: Browser native `TextDetector` API (if supported by Chromium/Android WebView).
     - Tier 3: Client-side `tesseract.js` WebAssembly worker running in background thread.
   - Deterministic Regex filters extract candidate dates (`potentialExpiry`), strengths (`potentialDosage`), and pack sizes (`potentialQuantity`).
4. **On-Device Visual Feature Classification (`src/services/imageCnnService.ts`)**:
   - An on-device pixel analyzer classifies the pharmaceutical form (blister strip, bottle, tube, box) and counts blister pocket cells locally.
5. **Online Intelligent AI Extraction (`server.ts` & `src/services/geminiService.ts`)**:
   - The app POSTs `{ base64Image, ocrText, hints, cnnFeatures }` to `/api/ai/extract`.
   - The Express backend proxy wraps the base64 image into an `inlineData` payload and invokes Google Gemini 2.5 Flash.
   - Gemini reconciles the visual label image with the OCR text fragments and returns structured JSON (medicine brand name, dosage strength, normalized ISO expiration date, form, quantity, instructions, category).
   - **Crucial Memory Discipline:** The server processes the payload strictly in Node.js heap memory. The image is **never written to a local server file**, never uploaded to an S3/Google Cloud Storage bucket, and never cached.
6. **Local Vault Image Storage (`src/services/localImageStorage.ts` & `src/App.tsx`)**:
   - When the user confirms and saves the medicine into their vault, the image is saved **exclusively into the device's sandboxed IndexedDB** (`DawaSnapLocalImages` -> `images`).
   - The Firestore document is saved with the string literal `"imageUrl": "local"`. **Neither Firestore nor Firebase Storage ever receives the image binary or base64 data.**
7. **Offline Mode (100% On-Device)**:
   - If the device is offline or the server is unreachable, the app falls back to `extractMedicineOfflineSlm()`, which combines on-device Tesseract OCR with the on-device Small Language Model (SLM) and CNN visual features. In this mode, **zero bytes ever leave the physical device**.

### 3.2 Explicit Audit Answers
| Question | Audit Finding | Technical Source of Truth |
| :--- | :--- | :--- |
| **A. Does the medicine image leave the device?** | **YES (during online AI extraction)** / **NO (when offline or using local mode)** | When online extraction is triggered, `base64Image` is transmitted over HTTPS to `/api/ai/extract` to invoke Gemini Vision. |
| **B. Does Gemini receive the original image?** | **YES** | `server/aiService.ts` lines 372–378 transmit `{ inlineData: { mimeType: "image/jpeg", data: base64Image } }` to Gemini. |
| **C. Does our backend temporarily receive/store the image?** | **RECEIVES: YES** / **STORES: NO** | The Express server receives the HTTP body in RAM to forward to Gemini. It is immediately freed by V8 garbage collection; no disk or bucket persistence exists. |
| **D. Is the image stored in IndexedDB?** | **YES** | `localImageStorage.ts` saves the base64 string locally in the client's `DawaSnapLocalImages` database for instant gallery rendering. |
| **E. Is the image stored in Firebase/Cloud Storage?** | **NO** | Firebase Cloud Storage is not initialized in the application. Firestore stores only metadata with `"imageUrl": "local"`. |
| **F. What exact data is transmitted to Gemini?** | **Image + OCR fragments + Clinical hints** | JPEG Base64 image, OCR text extracted by Tesseract, regex candidate expiry/dosage hints, and CNN visual packaging classifications. **Zero PII (no name, email, or UID) is included.** |

---

## 4. 🔴 AREA 2 — Gemini AI Data Privacy & Isolation

### 4.1 Feature-by-Feature Data Transmission Matrix
| Feature | Data Sent to Gemini | PII Included? | Health Data Included? | Image Included? | Stored by Us? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Medicine OCR / Extraction** | Base64 packaging image, OCR text fragments, candidate expiry/dosage regex hints, CNN packaging type. | **NO** | Medicine packaging text | **YES** (Base64 JPEG) | **NO** (Processed ephemerally in RAM) |
| **2. Drug Interaction Checking** | Drug brand names and dosages (e.g., `["Augmentin 625mg", "Warfarin 5mg"]`). | **NO** | Drug names & strengths | **NO** | **NO** (In-memory response cache key only) |
| **3. AI Pharmacist Chat** | User conversation messages + active medicine inventory summary (`name`, `dosage`, `form`, `expirationDate`, `quantity`). | **NO** (User email, name, UID stripped) | Self-reported medical symptoms & medicine names | **NO** | **NO** (Strict zero model training) |
| **4. Auto-Categorization & Form Check** | Array of `{ id, name, dosage, usageInstructions, form }`. | **NO** | Medicine names & dosages | **NO** | **NO** |
| **5. Consultation Report Generation** | Medicine names and conversation log summary. | **NO** | Inventory & chat text | **NO** | Stored in user's private Firestore `mail` doc for in-app mailbox |

### 4.2 Backend Proxy Security & Secret Isolation
- **Client Bundle Protection:** The application uses a secure backend proxy (`server.ts` -> `/api/ai/*`). The primary `GEMINI_API_KEY` is stored strictly in server-side environment secrets.
- **Zero API Key Leakage:** Client-side network inspections reveal that frontend requests target `/api/ai/extract` and `/api/ai/chat`. The secret key is injected only on the Node.js server before calling the `@google/genai` SDK.
- **Client Fallback Safety:** If a developer manually configures a client-side key in local development storage, it is stored in browser-sandboxed `localStorage` and never transmitted across network boundaries.

---

## 5. 🔴 AREA 3 — Firestore Data Inventory & Security Rules

### 5.1 Collection-by-Collection Catalog
| Collection / Document Path | Data Fields Stored | Personal Data? | Health Data? | Retention Period | Deletion on Account Purge? | Included in CSV? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `medicines/{medicineId}` | `id`, `name`, `dosage`, `expirationDate`, `userId`, `createdAt`, `updatedAt`, `usageInstructions`, `form`, `quantity`, `schedule`, `category`, `tags`, `isDeleted`, `deletedAt`, `enableEmailExpiryAlert`, `enableLowStockAlert`, `lowStockThreshold`, `imageUrl: "local"`. | User UID reference | **YES** (Full medication record) | Until user deletes or account deleted | **YES (Permanent)** | **YES** |
| `medicines/{id}/history/{histId}` | `id`, `medicineId`, `userId`, `timestamp`, `actionType` (`CREATE`, `EDIT`, `MARK_TAKEN`, `MARK_NOT_TAKEN`, `DELETE`), `details`. | User UID reference | **YES** (Intake adherence audit trail) | Retained with parent medicine | **YES (Subcollection purged)** | No (Export covers active meds) |
| `userConfigs/{userId}` | `userId`, `email`, `emailNotificationsEnabled`, `browserNotificationsEnabled`, `alertThreshold`, `accentColor`, `sortOrder`, `lowQuantityThreshold`, `theme`. | Email address & UID | No (UI settings) | Lifetime of account | **YES (Permanent)** | No |
| `users/{userId}/settings/appSettings` | `userId`, `email`, notification flags, display preferences. | Email address & UID | No (UI preferences) | Lifetime of account | **YES (Permanent)** | No |
| `users/{userId}/chats/{sessionId}` | `id`, `userId`, `title`, `createdAt`, `lastMessageAt`, `provider`. | User UID reference | Clinical consultation topic | Lifetime of account | **YES (Permanent)** | No |
| `users/{userId}/chats/{id}/messages/{msgId}`| `role`, `content`, `timestamp`, `provider`. | User UID reference | Pharmacological questions & answers | Lifetime of account | **YES (Permanent)** | No |
| `mail/{mailId}` | `to`, `message` (`subject`, `text`, `html`), `timestamp`, `status`. | Recipient email | Expiry/Refill notices dispatched | Retained for in-app treatment mailbox | Retained in user inbox until purged | No |
| `user_push_tokens/{tokenId}` | `userId`, `token` (FCM registration token), `platform`, `updatedAt`. | Push registration endpoint | No | Active device session | **YES (Purged via API)** | No |
| `server_expiry_schedules/{userId}` | `userId`, `email`, `emailNotificationsEnabled`, `medicines` array, `updatedAt`. | Email address & UID | Active medicine names & expiry dates | Kept in sync with active inventory | **YES (Purged via API)** | No |
| `server_sent_expiry_alerts/{alertId}`| `userId`, `medId`, `medName`, `stage`, `email`, `expirationDate`, `status`, `sentAt`. | Email address & UID | Medicine name & expiry | Permanent alert deduplication record | Retained on server for anti-spam audit | No |
| `server_chat_limits/{limitId}` | `count`, `updated_at`. | User UID reference | No (Daily usage counter) | 24 hours | Ephemeral date-keyed | No |

### 5.2 Firestore Security Rules Audit (`firestore.rules`)
- **Strict User Isolation:** All user collections enforce `resource.data.userId == request.auth.uid`. A logged-in user can never read, query, list, or write another user's documents.
- **Immutable History:** `match /medicines/{medicineId}/history/{historyId}` defines `allow update: if false;`, ensuring medication audit records cannot be tampered with.
- **Subcollection Access Guard:** History records require `get(/databases/$(database)/documents/medicines/$(medicineId)).data.userId == request.auth.uid`, ensuring parent ownership governs history.
- **Schema Validation:** Field-type, length, and regex validations prevent script injection or payload inflation.

---

## 6. 🟠 AREA 4 — Account Deletion Lifecycle & Verification

### 6.1 Complete "Delete Account & All Data" Execution Trace
When a user initiates account deletion from the app (or via the compliant web deletion portal):
```
[User Confirms 'DELETE' in App or Portal]
                    │
                    ▼
 1. Query all user medicines in Cloud Firestore
    FOR EACH medicine document:
      a. Query subcollection 'medicines/{id}/history'
      b. Batch delete all history documents
      c. Delete the parent medicine document
                    │
                    ▼
 2. Delete user configuration document ('userConfigs/{userId}')
                    │
                    ▼
 3. Delete user settings ('users/{userId}/settings/appSettings')
                    │
                    ▼
 4. Query & delete all user chat sessions & subcollection 'messages'
                    │
                    ▼
 5. Purge any legacy SLM knowledge documents ('users/{userId}/slmKnowledge')
                    │
                    ▼
 6. POST to server '/api/user/purge-data':
      a. Remove user from in-memory expiry cron schedule
      b. Remove user push tokens from in-memory token map
      c. Delete Firestore document 'server_expiry_schedules/{userId}'
      d. Delete all Firestore documents in 'user_push_tokens' for that userId
                    │
                    ▼
 7. Clear Physical Device Storage:
      a. 'localImageStorage.clearAll()' -> Purges 100% of IndexedDB medicine photos
      b. 'localStorage.clear()' -> Purges cached settings & tokens
      c. 'sessionStorage.clear()'
                    │
                    ▼
 8. Permanent Firebase Authentication Removal:
      Execute 'user.delete()' to erase authentication profile from Firebase Auth.
      (If re-authentication required, triggers graceful sign-out and instructions).
```

### 6.2 Standalone Web Deletion Portal
In accordance with the **Google Play Store Account Deletion Policy**, users who have uninstalled the application or switched devices can access the web deletion portal at:
`https://dawasnap.vercel.app/delete-account` (or `/account-delete`).
This page allows users to:
1. Delete their account immediately if authenticated in the browser.
2. Submit a formal deletion request via registered email without logging in, which is processed and permanently wiped within 48 hours.

---

## 7. 🟠 AREA 5 — Soft Delete vs. Permanent Delete Lifecycle

### 7.1 Single Medicine Deletion Lifecycle
```
[Active Medicine in Inventory]
              │
              │ User deletes medicine from list
              ▼
[Soft-Deleted State (isDeleted: true, deletedAt: timestamp)]
              │
              ├── User can view in "Recently Deleted"
              ├── User can restore within 15 days ('handleRestore')
              ├── Excluded from active drug interaction checks
              ├── Excluded from CSV export and expiry cron alerts
              │
              ▼ (15 Days Expire OR User Taps "Permanent Delete")
[Permanent Destruction ('handlePermanentDelete')]
              ├── Delete all documents in 'medicines/{id}/history'
              ├── Delete parent document 'medicines/{id}'
              └── Delete local photo from IndexedDB ('localImageStorage.deleteImage(id)')
```

### 7.2 Distinctions During Account Deletion
During full account deletion, the **soft-delete stage is completely bypassed**. All records (active, soft-deleted, and intake history) are immediately and permanently erased from Cloud Firestore and local IndexedDB.

---

## 8. 🟠 AREA 6 — Notification Systems & FCM Audit

### 8.1 Dual-Tier Notification Architecture
DawaSnap AI implements a hybrid notification model optimized for life-safety and battery efficiency:

```
+-----------------------------------------------------------------------------------------+
|                                    NOTIFICATION MODES                                   |
+-----------------------------------------------------------------------------------------+
| 1. LOCAL ALARMS (AlarmManager)               | 2. CLOUD EXPIRY PUSH (Firebase FCM)       |
| - Scheduled on device via Capacitor Local     | - Dispatched by server background cron  |
|   Notifications & Android AlarmManager.      |   running 24/7 on Render.                |
| - Wakes device for daily medication doses.   | - Dispatches 30-day, 7-day & expired     |
| - 100% offline, zero internet required.       |   pharmaceutical warnings.               |
| - Zero server communication.                 | - Operates even when app is closed.      |
+-----------------------------------------------------------------------------------------+
```

### 8.2 Push Token Governance & Privacy
- **Token Registration:** Handled via `/api/notifications/register-token`. Stored in Firestore collection `user_push_tokens`.
- **Payload Privacy:** FCM messages contain only title and body strings (e.g., `"🚨 Urgent: Augmentin has Expired"`). **No patient names, full clinical histories, or user identities are transmitted over push channels.**
- **Token Deletion:** All tokens are purged upon account deletion via `/api/user/purge-data`.

---

## 9. 🟠 AREA 7 — Transactional Email Privacy (Resend API)

### 9.1 Email Alerts & Content Audit
| Alert Type | Trigger Timing | Recipient | Medical / Health Data Included | PII Included |
| :--- | :--- | :--- | :--- | :--- |
| **30-Day Notice** | Exactly 30–31 days before expiration date | User verified email | Medicine name, quantity, expiration date | Email address |
| **7-Day Warning** | Exactly 7 days before expiration date | User verified email | Medicine name, quantity, expiration date | Email address |
| **Expired Alert** | Day of expiration up to 14 days post-expiry | User verified email | Medicine name, expiration date, safe chemical disposal advisory | Email address |
| **Low-Stock Alert** | Stock count drops below user threshold | User verified email | Medicine name, remaining quantity, alert limit | Email address |
| **Consultation Summary**| User explicitly clicks "Send Report" | User verified email | Active medication list + AI pharmacist chat transcript | Email address |

### 9.2 Anti-Spam & Deduplication Safeguards
- **Atomic Deduplication:** Before sending any email, the backend worker queries `server_sent_expiry_alerts` for key `${userId}_${medId}_${stage}`.
- If an alert was already dispatched for that medicine at that stage, it is skipped.
- **Strictly Single Delivery:** Every email alert is sent exactly **once per medicine stage**, eliminating duplicate emails across multiple logged-in devices.

---

## 10. 🟡 AREA 8 — Crashlytics & Diagnostics

### 10.1 Telemetry Audit
- **Crashlytics Initialization (`src/services/crashReportingService.ts`)**: Active on native Android via `@capacitor-firebase/crashlytics`.
- **User Identifier:** `setCrashReportingUser()` sets only the anonymized Firebase Auth UID string (`userId`). It **never logs user email, name, or phone number**.
- **Exception Context:** Custom keys log only generic stack traces (`error_context: "ReactErrorBoundary"`).
- **Zero Medical Data:** No medicine names, dosages, consultation texts, or photos are ever logged into Crashlytics breadcrumbs or crash reports.

---

## 11. 🟡 AREA 9 — Code Improvements & Reconciliations Applied

In direct response to the comprehensive audit, the following engineering fixes and synchronizations were implemented across the codebase:

1. **Fixed Account Deletion Flow (`src/App.tsx`)**:
   - Replaced shallow medicine document deletion with recursive subcollection deletion: all `medicines/{id}/history` records are now purged prior to parent deletion.
   - Added automated deletion for `userConfigs`, `users/{uid}/settings`, and `users/{uid}/chats/messages`.
   - Integrated `localImageStorage.clearAll()` into account deletion to guarantee that sandboxed IndexedDB images are completely wiped from the physical device.
2. **Added Server-Side Data Purge (`server.ts` & `server/expiryCron.ts`)**:
   - Implemented `purgeUserServerData(userId)` and registered `POST /api/user/purge-data`.
   - Server memory schedules, push token maps, `server_expiry_schedules` documents, and `user_push_tokens` documents are now completely destroyed upon account deletion.
3. **Reconciled Privacy Policy (`src/components/PrivacyPolicyPage.tsx` & `public/privacy.html`)**:
   - Harmonized Article 3 to accurately describe the hybrid architecture: packaging photos are stored locally in IndexedDB, streamed ephemerally over TLS 1.3 to Gemini for online OCR, or processed 100% on-device in offline mode.
   - Updated notification disclosures to explicitly detail both local Android alarms and cloud push notifications via Firebase FCM.
   - Expanded the Data Processing Matrix in Article 5 to explicitly document all Firestore collections (`medicines`, `history`, `userConfigs`, `mail`, and push tokens).
4. **Optimized Build Bundle (`package.json`)**:
   - Removed unused development dependencies (`nodemailer`, `dotenv`, duplicate `vite`) to maximize security posture and reduce attack surface.

---

## 12. Verification & Compliance Sign-Off

- **TypeScript Compilation:** Passed with zero errors (`npx tsc --noEmit`).
- **Production Build:** Verified clean build via Vite compiler (`npm run build`).
- **Google Play Data Safety Declaration:** Aligned with all Google Play Store Health & Medical app guidelines and Account Deletion mandates.
- **Contact for Technical & Legal Inquiries:**  
  **Data Protection & Grievance Officer:** MD NOOR HASSAN  
  **Official Email:** `newluckypharmacy@gmail.com`  
  **Application Portal:** `https://dawasnap.vercel.app`
