# DawaSnap AI — Official User Guide & Operating Manual
**Document Reference:** `DAWASNAP-GUIDE-2026-V2.5`  
**Application Identity:** DawaSnap AI (Android Package: `in.dawasnap.app`)  
**Web Application:** `https://dawasnap.vercel.app` & `https://dawasnapai.onrender.com`  
**Support Desk:** `mdnoor4860@gmail.com`  
**Account Deletion Portal:** `https://dawasnap.vercel.app/delete-account`  

---

## Welcome to DawaSnap AI
**DawaSnap AI** is your intelligent medication inventory vault, expiration monitoring companion, and personal digital pharmacist. Whether managing a single daily prescription or an entire household first-aid cabinet, DawaSnap AI prevents accidental consumption of expired pharmaceuticals, screens for dangerous drug interactions, and keeps your medical supplies organized.

This manual provides comprehensive, step-by-step instructions for all features and capabilities.

---

## Table of Contents
1. [Getting Started & Account Setup](#1-getting-started--account-setup)
2. [Adding Medications via AI Camera Scanning](#2-adding-medications-via-ai-camera-scanning)
3. [Manual Medicine Entry & Form Selection](#3-manual-medicine-entry--form-selection)
4. [Medication Vault Management & FIFO Batches](#4-medication-vault-management--fifo-batches)
5. [Expiration Monitoring & Multi-Stage Alerts](#5-expiration-monitoring--multi-stage-alerts)
6. [Daily Dose Alarms & Android Exact Timers](#6-daily-dose-alarms--android-exact-timers)
7. [Drug-Drug Interaction Checker](#7-drug-drug-interaction-checker)
8. [AI Pharmacist Companion ("Dr. DawaSnap")](#8-ai-pharmacist-companion-dr-dawasnap)
9. [CSV Data Export, Import & Sheets Sync](#9-csv-data-export-import--sheets-sync)
10. [Data Privacy, Local Storage & Account Deletion](#10-data-privacy-local-storage--account-deletion)
11. [Troubleshooting & Frequently Asked Questions](#11-troubleshooting--frequently-asked-questions)

---

## 1. Getting Started & Account Setup

### 1.1 Supported Platforms
- **Android Native Application:** Download the signed APK directly or via Google Play Store (Package: `in.dawasnap.app`). Compatible with Android 8.0 (API 26) through Android 15.
- **Progressive Web App (PWA):** Access from any modern desktop or mobile browser at `https://dawasnap.vercel.app`. You can install it to your home screen via Chrome/Safari ("Add to Home Screen").

### 1.2 Sign-In Options
1. **Google Sign-In (Recommended):** Tap **Continue with Google** for instantaneous, secure one-tap authentication. Only basic OpenID profile data (`email`, `name`, `profile picture`) is requested. No access to your Google Drive, Gmail, or calendar is ever requested.
2. **Email & Password Authentication:** Enter your email address and a secure password. If you are registering for the first time, your account is provisioned immediately.

---

## 2. Adding Medications via AI Camera Scanning

DawaSnap AI features an advanced hybrid computer vision and optical character recognition (OCR) engine tailored specifically for shiny blister foils, small pharmaceutical fonts, and curved syrup bottles.

```
[Point Camera at Medicine Box / Blister Foil]
                     │
                     ▼
[In-Memory Contrast Curve & Anti-Glare Filter]
                     │
                     ▼
[Local On-Device OCR (Tesseract / Native Bridge) + Heuristic Packaging Classifier]
                     │
                     ▼
[Gemini 2.5 Flash Multimodal Vision Validation]
                     │
                     ▼
[Auto-Populated Review Screen: Name, Strength, Form, Expiry, Qty]
                     │
                     ▼
[Save to Vault: Image cached in IndexedDB, Metadata in Firestore]
```

### 2.1 Scanning Instructions
1. Tap the green **Camera / Scan** button in the bottom floating navigation bar.
2. Position the medicine packaging inside the viewfinder rectangle.
   - **For Blister Strips:** Turn the foil side toward the light so the embossed or printed expiration stamp (`EXP`, `BB`, `B.No`) is clearly visible. Our in-memory pre-processor automatically applies an adaptive contrast curve to reduce foil reflections.
   - **For Syrup Bottles or Boxes:** Align the primary label showing the brand name and dosage strength (e.g., `Augmentin 625 Duo`, `Dolo 650`).
3. Tap **Capture / Scan Label**.
4. The scanner automatically detects:
   - **Medicine Name & Formulation:** (e.g., *Paracetamol 500mg*, *Amoxicillin & Clavulanate*).
   - **Dosage Strength:** (e.g., *650mg*, *10ml*, *500mcg*).
   - **Normalized Expiration Date:** Automatically parsed into `YYYY-MM-01` ISO format.
   - **Form & Quantity:** Form type and estimated unit count or bottle volume.
5. Review the extracted fields in the confirmation modal. Tap any field to make manual corrections if desired, then tap **Save to Vault**.

### 2.2 Offline Scanning Fallback
If you are traveling or lack internet connectivity, DawaSnap AI seamlessly falls back to on-device scanning using client-side text recognition and our offline rule-based reference engine. Zero bytes leave your device in this mode.

---

## 3. Manual Medicine Entry & Form Selection

If your packaging is severely worn or you prefer typing:
1. Tap the **+ Add Medicine** button on the home screen.
2. Start typing the medicine name. The intelligent clinical autocomplete queries over 150+ standard formulations in real-time.
3. Select the pharmaceutical dosage form:
   - 💊 **Tablet:** Pills, chewable tablets, caplets, dispersible tabs.
   - 💊 **Capsule:** Hard gelatin, softgel capsules.
   - 🧴 **Syrup:** Oral solutions, suspensions, pediatric drops.
   - 💉 **Ampule:** Injectables, vials, IV/IM infusions.
   - 📦 **Powder:** Rehydration sachets (ORS), dry syrup powder.
   - 🩹 **Tape / Patch:** Transdermal medicinal plasters.
   - 💧 **Liquid:** Antiseptic washes, topical lotions, gargles.
   - 🌿 **Other:** Inhalers, eye/ear drops, ointments, sprays.
4. Set the **Quantity** (units remaining in pack) and **Expiration Date**.
5. Set custom alert preferences:
   - **Low-Stock Alert:** Receive warnings when remaining pills drop below a threshold (default: 5 units).
   - **Email Expiry Alerts:** Toggle automated email dispatch on or off.

---

## 4. Medication Vault Management & FIFO Batches

### 4.1 First-In, First-Out (FIFO) Batch Grouping
When you purchase multiple strips of the same medication over several months, DawaSnap AI groups them under a single clean medicine card while maintaining independent batch expiration tracking:
- **Nearest Expiry First:** The batch closest to expiration is always displayed prominently with an urgent colored badge.
- **Quick Deduct (-1 Button):** Tapping the `-1` button automatically deducts from the oldest active batch first, encouraging you to consume near-expiry pills before opening fresh stock.

### 4.2 Filtering & Category Organization
Use the top filter bar to instantly organize your vault:
- **All / Active:** View currently usable medications.
- **Liked / Starred:** Quick access to daily maintenance medicines.
- **Expiring Soon:** Highlights medicines expiring within your configured threshold (e.g., within 30 days).
- **Clinical Categories:** Filter by therapeutic class (*Heart, Pain Relief, Antibiotics, Diabetes, Vitamins, Digestive, Allergy, Respiratory, Mental Health, Skin Care, Eye & Ear*).

### 4.3 Dose Tracking & Intake History
Every time you take a dose or edit an entry, an immutable audit event is recorded in the medicine's history log (`CREATE`, `EDIT`, `MARK_TAKEN`, `DELETE`). Tap any medicine card and select **View History** to inspect adherence logs.

---

## 5. Expiration Monitoring & Multi-Stage Alerts

DawaSnap AI features an automated multi-stage safety alert policy to ensure zero expired medications remain in household cabinets:

```
[Timeline to Expiration]
       │
       ├─► 30-31 Days Remaining: STAGE 1 — 1 MONTH ADVANCE NOTICE (Plan refills)
       │
       ├─► 7 Days Remaining:     STAGE 2 — 1 WEEK URGENT WARNING (Physician renewal)
       │
       └─► 0 to -14 Days:        STAGE 3 — EXPIRED ADVISORY (Do Not Consume & Safe Disposal)
```

### 5.1 Automated Email Delivery (Resend API)
- Automated alerts are sent from `DawaSnap AI <alerts@noorpos.in>` (or `onboarding@resend.dev`).
- **Atomic Deduplication:** Alerts are tracked on the server to guarantee strictly **one email per medicine per stage**. You will never receive repetitive duplicate emails for the same batch.
- **Safe Chemical Disposal Guidance:** When a medicine expires, the email provides critical safe disposal advisories (e.g., participating in pharmacy take-back drop-offs, mixing with coffee grounds in sealed pouches, and strictly avoiding flushing down household plumbing).

---

## 6. Daily Dose Alarms & Android Exact Timers

### 6.1 Exact Alarms (`USE_EXACT_ALARM`)
On Android 13+ and 14+, daily intake reminders require exact alarm scheduling:
- Local dose alarms are registered directly with the Android system's native `AlarmManager`.
- **100% Offline Precision:** They function independently of internet connectivity and wake the device precisely at your prescribed intake time.

### 6.2 Cloud Push Notifications (FCM)
For expiration warnings and multi-device sync, DawaSnap AI supports Firebase Cloud Messaging (FCM). Configure permissions in **Settings** → **Browser / System Notifications**.

---

## 7. Drug-Drug Interaction Checker

When managing concurrent medications, hidden pharmacological contraindications can cause adverse events:
1. Tap the **Assistant** tab or select **Check Interactions**.
2. DawaSnap AI automatically screens all active medications in your vault (minimum 2 medicines required).
3. The screening engine evaluates:
   - **Severity Level:** 🟢 Low, 🟡 Moderate, or 🔴 High.
   - **Clinical Mechanism:** Why the two active ingredients interact (e.g., competitive CYP enzyme inhibition, additive bleeding risk).
   - **Actionable Recommendation:** Guidance to discuss with your prescribing physician.

*Clinical Disclaimer:* The interaction checker is an educational screening aid and does not replace the professional clinical judgment of your doctor or pharmacist.

---

## 8. AI Pharmacist Companion ("Dr. DawaSnap")

Your interactive, family-doctor-style companion is available 24/7 in the **Assistant** tab.

### 8.1 Key Capabilities
- **Vault-Aware Context:** When you ask, *"What painkillers do I have?"* or *"Do I have anything for a dry cough?"*, Dr. DawaSnap meticulously cross-references the actual inventory in your vault first before suggesting general over-the-counter options.
- **Multilingual & Hinglish Support:** Dr. DawaSnap natively understands English, Hindi, and **Hinglish** (e.g., *"Aapko ye Paracetamol din mein do baar khana khane ke baad leni hai"*).
- **Consultation Reports:** Tap **Send Consultation Report** to receive a structured digital summary of your chat and current medication inventory delivered directly to your verified email address and in-app Treatment Mailbox.

---

## 9. CSV Data Export, Import & Sheets Sync

Maintain full sovereignty and offline backups of your medication records:
- **Export to CSV:** Tap **Settings** → **Export Data (CSV)**. Downloads a cleanly formatted `.csv` file compatible with Microsoft Excel, Apple Numbers, and Google Sheets.
- **Import from CSV:** Easily restore or batch-load medicines from a spreadsheet by uploading your `.csv` file.

---

## 10. Data Privacy, Local Storage & Account Deletion

### 10.1 Zero Cloud Image Storage
Medicine packaging photographs are stored exclusively in your local device's browser/phone sandboxed **IndexedDB** (`DawaSnapLocalImages`). They are **never** uploaded to cloud databases or remote storage buckets.

### 10.2 Soft Delete vs. Permanent Purge
- When you delete a medicine, it enters **Recently Deleted** for a 15-day grace period. You can restore it at any time.
- After 15 days (or if you click *Permanent Delete*), the medicine, its entire intake history subcollection, and its local photo are permanently erased.

### 10.3 Complete Account Deletion
In accordance with Google Play Store Policies and the India DPDP Act 2023, you can permanently wipe your account and all data:
- **In-App:** Go to **Settings** → **Danger Zone** → **Delete Account & All Data** → Type `DELETE`.
- **Web Portal (Without App Installed):** Visit `https://dawasnap.vercel.app/delete-account` to submit an instant or email-based deletion request. All cloud documents, push tokens, server schedules, and local caches are permanently purged within 48 hours.

---

## 11. Troubleshooting & Frequently Asked Questions

#### Q1: Why didn't my camera recognize the expiration date?
- **Answer:** Embossed foil stamps (stamped directly into metallic blister foil) often lack contrast under direct overhead light. Tilt the strip at a 45-degree angle so shadows highlight the raised digits, or tap manual entry to type the date in seconds.

#### Q2: Are my dose alarms affected by phone battery saver modes?
- **Answer:** Some Android manufacturers (Xiaomi, Samsung, OnePlus) enforce aggressive background task killing ("Doze Mode"). To guarantee alarms fire on time, go to your phone's **Settings** → **Apps** → **DawaSnap AI** → **Battery** → select **Unrestricted**.

#### Q3: How do I change my primary notification email?
- **Answer:** Open **Settings** (gear icon) on the top bar, update the email address field in your profile card, and tap **Save Settings**.

---

### Support & Grievance Contact
For technical support, feedback, or legal inquiries:
- **Service Provider & Developer:** MD NOOR HASSAN
- **Official Support Email:** `mdnoor4860@gmail.com`
- **Application Portal:** `https://dawasnap.vercel.app`
