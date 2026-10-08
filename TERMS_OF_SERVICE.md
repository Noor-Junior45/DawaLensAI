# DawaSnap AI — Terms of Service & Clinical Usage Agreement
**Document Reference:** `DAWASNAP-TOS-2026-V2.5`  
**Effective Date:** October 3, 2026  
**Last Revised:** October 3, 2026  
**Operating Developer & Service Provider:** MD NOOR HASSAN  
**Contact Email:** `newluckypharmacy@gmail.com`  
**Service Domains:** `https://dawasnap.vercel.app` & `https://dawasnapai.onrender.com`  
**Android Application Package:** `in.dawasnap.app`  
**Statutory Deletion Portal:** `https://dawasnap.vercel.app/delete-account`  
**Governing Law:** Republic of India  
**Exclusive Jurisdiction:** Competent Courts in Kolkata, West Bengal, India  

---

### IMPORTANT NOTICE — READ CAREFULLY BEFORE ACCESSING OR USING THE APPLICATION:
THIS TERMS OF SERVICE AND CLINICAL USAGE AGREEMENT ("TERMS", "AGREEMENT", OR "TERMS OF USE") IS A LEGALLY BINDING CONTRACT BETWEEN YOU ("USER", "YOU", OR "YOUR") AND **MD NOOR HASSAN** ("OPERATING DEVELOPER", "SERVICE PROVIDER", "DAWASNAP AI", "WE", "US", OR "OUR"). 

BY CLICKING "I AGREE", CREATING AN ACCOUNT, SCANNING A MEDICATION PACKAGING, INTERACTING WITH THE AI PHARMACIST, OR OTHERWISE ACCESSING OR USING THE DAWASNAP AI APPLICATION (MOBILE APK OR PROGRESSIVE WEB APP), YOU EXPLICITLY ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREED TO BE LEGALLY BOUND BY ALL PROVISIONS SET FORTH HEREIN. 

IF YOU DO NOT AGREE UNCONDITIONALLY TO ALL TERMS OF THIS AGREEMENT, YOU ARE STRICTLY PROHIBITED FROM ACCESSING OR USING DAWASNAP AI AND MUST IMMEDIATELY UNINSTALL AND CEASE ALL USE OF THE APPLICATION.

---

## 1. CRITICAL MEDICAL & CLINICAL DISCLAIMERS (MANDATORY HEALTH DECLARATION)

### 1.1 Non-Medical Device Declaration
DAWASNAP AI IS STRICTLY AN INFORMATIONAL, EDUCATIONAL, AND PERSONAL INVENTORY RECORD-KEEPING APPLICATION. IT IS **NOT** A MEDICAL DEVICE, CLINICAL DECISION SUPPORT SYSTEM (CDSS), MEDICAL SOFTWARE, PRESCRIPTION DISPENSING PLATFORM, OR DIAGNOSTIC INSTRUMENT UNDER THE DRUGS AND COSMETICS ACT (INDIA), THE MEDICAL DEVICE RULES (INDIA), THE UNITED STATES FOOD, DRUG, AND COSMETIC ACT (21 U.S.C. § 321(H)), EU MEDICAL DEVICE REGULATION (EU 2017/745), OR ANY COMPARABLE STATUTE IN ANY JURISDICTION.

### 1.2 Absence of Doctor-Patient or Pharmacist-Patient Relationship
NO LICENSED DOCTOR-PATIENT, PHARMACIST-PATIENT, NURSE-PATIENT, OR CONFIDENTIAL MEDICAL PROFESSIONAL RELATIONSHIP IS CREATED OR IMPLIED BETWEEN YOU AND DAWASNAP AI, ITS DEVELOPER, OR ITS AFFILIATES BY VIRTUE OF YOUR USE OF THE APPLICATION. ALL INTERACTIONS WITH THE ARTIFICIAL INTELLIGENCE PHARMACIST ("DR. DAWASNAP"), ON-DEVICE OCR EXTRACTORS, DRUG INTERACTION SCREENERS, EXPIRY MONITORS, OR NOTIFICATION GENERATORS ARE AUTOMATED, ALGORITHMIC, AND FOR PERSONAL REFERENCE ONLY.

### 1.3 Non-Substitute for Professional Medical Advice
THE SERVICES AND GENERATED CONTENT DO NOT CONSTITUTE CLINICAL DIAGNOSIS, MEDICAL ADVICE, PHARMACOTHERAPY TREATMENT, INDIVIDUALIZED PRESCRIPTION VALIDATION, OR DOSAGE RECOMMENDATIONS. NEVER DISREGARD, DELAY IN OBTAINING, OR ALTER PROFESSIONAL MEDICAL ADVICE, DIAGNOSIS, PRESCRIPTION MEDICATIONS, OR TREATMENT PLANS PRESCRIBED BY YOUR REGISTERED MEDICAL PRACTITIONER, ATTENDING PHYSICIAN, HOSPITAL CLINICIAN, OR LICENSED PHARMACIST BASED ON ANY INFORMATION, OUTPUT, SCHEDULE, OR WARNING DISPLAYED BY DAWASNAP AI.

### 1.4 Mandatory Verification of Packaging, Dosages & Expiration
OPTICAL CHARACTER RECOGNITION (OCR), COMPUTER VISION, AND CLINICAL ALGORITHMS ARE INHERENTLY SUBJECT TO OPTICAL ABERRATIONS, SCANNER GLARE, CAMERA BLUR, AMBIGUOUS PACKAGING FONTS, AND PARSING ERRORS. YOU AGREE THAT IT IS YOUR SOLE, NON-DELEGABLE RESPONSIBILITY TO MANUALLY AND VISUALLY CROSS-CHECK ALL SCANNED MEDICINE NAMES, ACTIVE SALTS, DOSAGE STRENGTHS, QUANTITIES, STORAGE INSTRUCTIONS, AND EXPIRATION DATES AGAINST THE PHYSICAL MEDICINE PACKAGING, EMBOSSED FOIL BLISTER STAMP, OR WRITTEN PHYSICIAN PRESCRIPTION BEFORE INGESTING, ADMINISTERING, OR DISCARDING ANY PHARMACEUTICAL.

### 1.5 Acute Medical Emergencies Protocol
DAWASNAP AI IS NEITHER DESIGNED NOR INTENDED FOR USE IN ACUTE MEDICAL EMERGENCIES, SUDDEN LIFE-THREATENING CONDITIONS, ACCIDENTAL OVERDOSES, ANAPHYLAXIS, POISONING, CHEST PAIN, OR RAPID CLINICAL DETERIORATION. IF YOU SUSPECT OR EXPERIENCE A MEDICAL EMERGENCY:
- **IN INDIA:** IMMEDIATELY CALL **112** (NATIONAL EMERGENCY NUMBER) OR **108** (EMERGENCY MEDICAL AMBULANCE), OR PROCEED TO THE NEAREST HOSPITAL EMERGENCY WARD.
- **IN THE UNITED STATES / CANADA:** IMMEDIATELY CALL **911** OR THE REGIONAL POISON CONTROL CENTER (**1-800-222-1222**).
- **IN THE UNITED KINGDOM:** IMMEDIATELY CALL **999** OR **111**.
- **IN THE EUROPEAN UNION:** IMMEDIATELY CALL **112**.
- **IN AUSTRALIA:** IMMEDIATELY CALL **000**.

---

## 2. SERVICES DESCRIPTION & TECHNICAL ARCHITECTURE DISCLOSURES

### 2.1 Scope of Services
DawaSnap AI provides users with a digital utility suite including:
1. **Medication Inventory Vault:** Secure cataloging of medication trade names, generic salts, dosage strengths, formulations (tablets, syrups, capsules, ampules), remaining stock counts, and manufacturer expiry dates.
2. **On-Device OCR & Visual Classifier:** In-memory pre-processing and optical character recognition running via native platform bridges, client-side Tesseract.js (WebAssembly), and heuristic packaging classification.
3. **Adherence & Expiration Reminders:** Local alarm scheduling for daily dose schedules and cloud-assisted multi-stage expiration warnings (dispatched at 30 days, 7 days, and expiration date).
4. **Drug Interaction Screener:** Algorithmic cross-checking of concurrent medications for reported clinical drug-drug interactions and pharmacological precautions.
5. **AI Pharmacist Companion ("Dr. DawaSnap"):** Interactive conversational assistant delivering general pharmacological compendia summaries, lifestyle tips, and medication inventory search assistance.

### 2.2 Artificial Intelligence & Third-Party LLM Disclosures
DawaSnap AI utilizes a hybrid dual-layer clinical assistance framework:
- **Cloud Reasoning Layer (Google AI Studio Gemini API):** For complex pharmacological interactions, multidrug regimens, and detailed usage instructions, queries are transmitted over encrypted TLS channels to Google Gemini models (`gemini-2.5-flash`). You acknowledge that prompts are de-identified (all personal identifiers stripped), and that cloud AI outputs may reflect latency, external service interruptions, or algorithmic hallucinations.
- **On-Device Reference Engine:** For fast, offline clinical consultation and offline label extraction, the application embeds an offline, rule-based clinical formulary and reference engine. The reference engine operates completely locally in device memory, with strict zero training on user conversation data.

### 2.3 Algorithmic Hallucination & Accuracy Disclaimer
You explicitly understand and accept that Large Language Models (LLMs) and Small Language Models (SLMs) generate probabilistic text. While trained on pharmaceutical compendia, AI models may occasionally generate inaccurate, incomplete, outdated, or hallucinated clinical assertions, incorrect dosage equivalencies, or inappropriate contraindications. DawaSnap AI makes no representation, warranty, or covenant regarding the absolute accuracy, completeness, or timeliness of any AI-generated response. You assume all risk arising from reliance upon AI-generated advice.

---

## 3. HARDWARE PERMISSIONS, NOTIFICATIONS & NETWORK USAGE

### 3.1 Notification Permissions (`POST_NOTIFICATIONS`) & Delivery
DawaSnap AI utilizes standard local and push notifications to deliver scheduled medicine expiration warnings and dose alerts. In compliance with Google Play Store exact alarm policies, DawaSnap AI does not require or request restricted exact alarm permissions (such as `SCHEDULE_EXACT_ALARM`). Notifications are dispatched through standard Android notification channels and Web Push.

### 3.2 Camera Permission (`CAMERA`) & Image Architecture
- The camera permission is invoked solely when you initiate optical scanning of a medication box, bottle, or foil strip.
- **Local Vault Storage:** Saved medication photos are stored 100% locally in your device's sandboxed `IndexedDB` storage (`DawaSnapLocalImages`). They are **never** uploaded or saved to remote databases, S3, or Firebase Cloud Storage.
- **Online OCR Stream:** In online mode, the captured frame is streamed ephemerally over encrypted TLS 1.3 to the backend proxy and Gemini 2.5 Flash for multimodal character recognition, processed in server RAM, and immediately garbage-collected without server disk caching.

### 3.3 Push Notifications (`POST_NOTIFICATIONS`) & Transactional Email
- The application requests push notification permissions to deliver expiration warnings and dose alerts. DawaSnap AI maintains a strict zero-marketing guarantee: we never broadcast advertisements, commercial promotions, or sponsored push notifications.
- When enabled in settings, transactional email alerts (30-day notice, 7-day warning, safe chemical disposal advisory) are dispatched via authenticated transactional infrastructure (Resend Inc.) strictly once per medicine stage.

---

## 4. USER ELIGIBILITY, ACCOUNT INTEGRITY & PROHIBITED CONDUCT

### 4.1 Minimum Age & Capacity
- You must be at least eighteen (18) years of age, or the legal age of majority in your jurisdiction of residence, to create an account or use DawaSnap AI independently.
- Minors between the ages of thirteen (13) and seventeen (17) may use the application solely under the active supervision, authorization, and direct responsibility of a parent or legal guardian who agrees to be bound by these Terms.
- Children under thirteen (13) years of age are strictly prohibited from using the application, creating an account, or submitting any personal or health data.

### 4.2 Account Security
You are solely responsible for maintaining the confidentiality of your authentication credentials (including email/password combinations and Google OAuth sessions). You agree to immediately notify us at `newluckypharmacy@gmail.com` of any suspected breach of security or unauthorized access. DawaSnap AI shall not be liable for any losses arising from unauthorized account access resulting from your failure to safeguard your credentials.

### 4.3 Prohibited Conduct & Usage Restrictions
You agree that you shall NOT, directly or indirectly:
1. **Reverse Engineering & Code Extraction:** Decompile, reverse engineer, disassemble, decrypt, unpack, extract proprietary databases, distill, or scrape the application source code or offline drug reference engine.
2. **Automated Scraping & Denial of Service:** Use bots, crawlers, automated scripts, spiders, or scrapers to extract pharmacological data, pharmaceutical compendia, or flood the API endpoints (`/api/ai/*`, `/api/send-email`).
3. **Medical Fraud & Commercial Resale:** Utilize DawaSnap AI to conduct unauthorized, unlicensed telemedicine, prescription fraud, counterfeit medication distribution, or commercial clinical decision support services.
4. **Security Circumvention:** Attempt to bypass, compromise, probe, or disable any security boundaries, authentication controls, rate limits, or `firestore.rules` access filters.
5. **Harmful Content:** Input or transmit any content that contains computer viruses, malware, trojan horses, worms, or malicious code designed to disrupt server operations.

---

## 5. INTELLECTUAL PROPERTY RIGHTS & DATA OWNERSHIP

### 5.1 Proprietary Ownership of the Service
All rights, title, and interest in and to DawaSnap AI—including but not limited to the software codebase, algorithmic logic, user interface design, visual styling, vector icons, Doctor Logo, trademarks, trade names, brand assets, pharmaceutical classification heuristics, and the proprietary Small Language Model (SLM) formulary weights—are and remain the exclusive intellectual property of **MD NOOR HASSAN**. Except for the limited, revocable, non-exclusive, non-transferable, personal license granted herein, no rights are granted to you by implication, estoppel, or otherwise.

### 5.2 User Ownership of Personal Medication Data
As between you and DawaSnap AI, you retain sole and exclusive ownership of all proprietary personal health data, medication entries, dosage notes, and photographs you input into the application ("User Health Data"). 

### 5.3 Limited License to Operate the Service
You grant DawaSnap AI a worldwide, non-exclusive, royalty-free, limited license to access, store, process, display, and transmit your User Health Data strictly as necessary to provide, maintain, synchronize, and operate the features of the Service for you, in full compliance with our Privacy Policy. This license automatically terminates when you delete your medication records or execute permanent account deletion.

### 5.4 Privacy Policy & Statutory Deletion Portal
Our collection, storage, encryption, and deletion of personal and health data is governed comprehensively by our **Privacy Policy & Data Safety Declaration** (accessible in-app and at `https://dawasnap.vercel.app/privacy`). In compliance with Google Play Store Policies and the India DPDP Act 2023, you can permanently and irreversibly erase your account and all associated cloud and local data at any time via:
- In-app: `Settings` → `Danger Zone` → `Delete Account & All Data`.
- Web portal: `https://dawasnap.vercel.app/delete-account`.

---

## 6. DISCLAIMER OF WARRANTIES ("AS IS" & "AS AVAILABLE")

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
1. **EXPRESS "AS IS" STIPULATION:** DAWASNAP AI, ITS ENTIRE APPLICATION SUITE, APIS, CLOUD STORAGE, ON-DEVICE OCR, ALARM REMINDERS, DRUG INTERACTION SCREENERS, AND AI PHARMACIST OUTPUTS ARE PROVIDED STRICTLY ON AN **"AS IS"** AND **"AS AVAILABLE"** BASIS, WITHOUT WARRANTIES, COVENANTS, OR CONDITIONS OF ANY KIND, EITHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.
2. **DISCLAIMER OF IMPLIED WARRANTIES:** MD NOOR HASSAN AND DAWASNAP AI EXPRESSLY DISCLAIM ALL WARRANTIES OF ANY KIND, INCLUDING BUT NOT LIMITED TO:
   - IMPLIED WARRANTIES OF MERCHANTABILITY, SATISFACTORY QUALITY, FITNESS FOR A PARTICULAR PURPOSE, AND WORKMANLIKE EFFORT.
   - WARRANTIES OF NON-INFRINGEMENT, TITLE, AND QUIET ENJOYMENT.
   - WARRANTIES THAT THE APPLICATION WILL BE UNINTERRUPTED, TIMELY, SECURE, ACCURATE, ERROR-FREE, FREE OF VIRUSES, MALWARE, OR OTHER HARMFUL COMPONENTS.
   - WARRANTIES REGARDING THE CLINICAL ACCURACY, MEDICAL RELIABILITY, PHARMACOLOGICAL COMPLETENESS, OR LIFE-SAFETY GUARANTEE OF ANY SCAN, OCR EXTRACTION, AI SUMMARY, OR NOTIFICATION TIMING.
3. **HARDWARE & OS LIMITATIONS:** WE DO NOT WARRANT THAT NOTIFICATIONS OR ALARMS WILL OPERATE WITHOUT DELAY ON ALL ANDROID HARDWARE OR CUSTOM ROMS WHERE AGGRESSIVE OS BATTERY OPTIMIZATION (OEM DOZE MODES) MAY KILL BACKGROUND TASKS OR DELAY LOCAL NOTIFICATIONS.

---

## 7. COMPREHENSIVE LIMITATION OF LIABILITY & INDEMNIFICATION

### 7.1 Exclusion of Consequential & Health Damages
TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, UNDER NO CIRCUMSTANCES SHALL MD NOOR HASSAN, DAWASNAP AI, ITS OPERATING DEVELOPER, CONTRIBUTORS, AGENTS, SERVICE PROVIDERS, OR LICENSORS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY:
- PERSONAL INJURY, BODILY HARM, ILLNESS, TEMPORARY OR PERMANENT DISABILITY, ADVERSE DRUG EVENT, PHARMACEUTICAL TOXICITY, ALLERGIC SHOCK, WRONGFUL DEATH, OR EMOTIONAL DISTRESS ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF, OR INABILITY TO USE, DAWASNAP AI.
- MISSED, DELAYED, DUPLICATED, OR INCORRECT MEDICATION DOSES RESULTING FROM BATTERY OPTIMIZATION, HARDWARE FAILURE, NOTIFICATION SETTINGS, OR OPERATING SYSTEM PERMISSION REVOCATION.
- INGESTION OR MISUSE OF EXPIRED, DAMAGED, RECALLED, OR CONTRAINDICATED PHARMACEUTICALS.
- ERRORS, TYPOGRAPHICAL ANOMALIES, OCR MISIDENTIFICATIONS, OR AI PHARMACIST HALLUCINATIONS.
- INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF PROFITS, DATA LOSS, REPUTATIONAL DAMAGE, OR BUSINESS INTERRUPTION), REGARDLESS OF THE LEGAL THEORY (CONTRACT, TORT, STRICT LIABILITY, NEGLIGENCE, PRODUCT LIABILITY, OR MEDICAL MALPRACTICE), EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

### 7.2 Strict Financial Liability Cap
NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED IN THIS AGREEMENT, IN NO EVENT SHALL THE TOTAL AGGREGATE LIABILITY OF MD NOOR HASSAN AND DAWASNAP AI FOR ALL CLAIMS, DISPUTES, LIABILITIES, LOSSES, COSTS, OR LAWSUITS ARISING UNDER OR RELATING TO THIS AGREEMENT OR THE USE OF THE SERVICE EXCEED:
- **THE TOTAL AMOUNT ACTUALLY PAID BY YOU TO DAWASNAP AI FOR USE OF THE SERVICES IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO LIABILITY; OR**
- **THE SUM OF ₹4,200 INR (FOUR THOUSAND TWO HUNDRED INDIAN RUPEES) OR $50.00 USD (FIFTY UNITED STATES DOLLARS), WHICHEVER IS LESS.**

### 7.3 User Indemnification
You agree to defend, indemnify, and hold harmless MD NOOR HASSAN, DawaSnap AI, and their respective operators, contractors, and partners from and against any and all third-party claims, liabilities, damages, losses, fines, penalties, judgments, costs, and expenses (including reasonable legal and attorney fees) arising out of or resulting from:
1. Your violation or breach of any provision of these Terms.
2. Your misuse, fraudulent deployment, or unlawful application of DawaSnap AI.
3. Your failure to seek qualified, professional medical consultation before taking, altering, or administering any medication.
4. Your infringement or violation of any third-party intellectual property, privacy, or statutory rights.

---

## 8. DISPUTE RESOLUTION, MANDATORY ARBITRATION & CLASS ACTION WAIVER

### 8.1 Mandatory 30-Day Informal Dispute Resolution
Prior to initiating any formal legal claim, arbitration, or judicial proceeding against DawaSnap AI or MD NOOR HASSAN, you agree to first send a detailed written notice of dispute by certified mail or email to:
`newluckypharmacy@gmail.com` with the subject line *"Formal Dispute Notice: DawaSnap AI"*.
The notice must set forth your full name, registered account email, a comprehensive description of the factual and legal nature of the claim, and the specific monetary or injunctive relief sought. Both parties agree to negotiate in good faith for a mandatory period of thirty (30) calendar days from receipt of the notice. Formal legal proceedings may only be commenced if the dispute remains unresolved upon expiration of the thirty-day informal period.

### 8.2 Governing Law & Statutory Framework
This Agreement, its construction, validity, interpretation, performance, and all disputes arising hereunder or in connection with DawaSnap AI shall be governed by, construed, and enforced in accordance with the substantive laws of the **Republic of India**, including the **Indian Contract Act, 1872**, the **Information Technology Act, 2000 & Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021**, and the **Digital Personal Data Protection (DPDP) Act, 2023**, without regard to conflict of laws principles. The United Nations Convention on Contracts for the International Sale of Goods (CISG) is expressly disclaimed and shall not apply.

### 8.3 Exclusive Forum & Jurisdiction
Subject to the informal dispute resolution provision above, both you and MD NOOR HASSAN irrevocably submit and agree to the sole and exclusive personal and subject-matter jurisdiction of the **Competent Civil Courts located in Kolkata, West Bengal, India**, to adjudicate and resolve any suit, legal action, or judicial proceeding arising out of or relating to these Terms or the DawaSnap AI application. You expressly waive any objection to venue, forum non conveniens, or territorial jurisdiction of the courts in Kolkata, West Bengal.

### 8.4 Express Class Action Waiver & Jury Waiver
TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
- **CLASS ACTION WAIVER:** ALL CLAIMS, DISPUTES, AND CAUSES OF ACTION MUST BE BROUGHT AND ADJUDICATED SOLELY IN THE PARTIES' INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF, REPRESENTATIVE, OR CLASS MEMBER IN ANY PURPORTED CLASS ACTION, COLLECTIVE ACTION, PRIVATE ATTORNEY GENERAL ACTION, REPRESENTATIVE PROCEEDING, OR CONSOLIDATED CLAIM.
- **NO CLASS RELIEF:** NEITHER AN ARBITRATOR NOR A COURT MAY CONSOLIDATE MORE THAN ONE INDIVIDUAL'S CLAIMS OR PRESIDE OVER ANY FORM OF REPRESENTATIVE OR CLASS PROCEEDING AGAINST DAWASNAP AI.
- **JURY WAIVER:** BOTH YOU AND DAWASNAP AI HEREBY WAIVE ANY CONSTITUTIONAL OR STATUTORY RIGHT TO A TRIAL BY JURY IN ANY PROCEEDING ARISING HEREUNDER.

---

## 9. MODIFICATIONS, SEVERABILITY & MISCELLANEOUS COVENANTS

### 9.1 Right to Amend Terms
We reserve the right, at our sole and absolute discretion, to update, amend, revise, or replace these Terms at any time to reflect legislative updates, technological improvements, Google Play Store Policy revisions, or functional enhancements. When changes are made:
- We will update the "Last Revised" and "Effective Date" at the top of this document.
- For material modifications affecting legal liability or health disclosures, we will provide prominent in-app notification or email notification to your registered address.
- Your continued access to or use of DawaSnap AI following the publication of updated Terms constitutes your irrevocable and binding acceptance of the revised Terms.

### 9.2 Severability & Savings Clause
If any provision, covenant, or clause of this Agreement is adjudged by a court or tribunal of competent jurisdiction to be illegal, invalid, void, or unenforceable under applicable law, such invalidity shall not affect the validity or enforceability of the remaining provisions. The invalid clause shall be severed, reformed, or limited to the minimum extent necessary so that the remaining provisions of these Terms remain in full force, effect, and operation.

### 9.3 Entire Agreement & Non-Waiver
These Terms of Service, together with the **Privacy Policy & Data Safety Declaration** and any platform-specific end-user agreements (such as the Google Play Terms of Service), constitute the sole, complete, and entire agreement between you and MD NOOR HASSAN regarding DawaSnap AI, superseding all prior oral, written, or contemporaneous understandings, proposals, or communications. The failure of DawaSnap AI to enforce or exercise any strict right, remedy, or provision of these Terms shall not operate or be construed as a waiver of that or any subsequent right or breach.

### 9.4 Assignment & Transfer
You may not assign, sublicense, delegate, or transfer your rights or obligations under these Terms without our prior written consent. MD NOOR HASSAN may freely assign or transfer rights and obligations under these Terms in connection with a corporate reorganization, merger, asset sale, acquisition, or by operation of law without restriction.

---

## 10. STATUTORY GRIEVANCE REDRESSAL & LEGAL CONTACT

In compliance with the **Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021** and the **Digital Personal Data Protection Act, 2023**, the details of our designated Operating Developer, Service Provider, and Grievance Officer are set forth below:

| Field | Official Compliance Detail |
| :--- | :--- |
| **Operating Developer & Service Provider** | **MD NOOR HASSAN** |
| **Designation** | Legal Controller & Data Protection Officer |
| **Official Contact Email** | `newluckypharmacy@gmail.com` |
| **Subject Line Requirement** | *"Terms of Service / Legal Inquiry — DawaSnap AI"* |
| **Statutory Acknowledgment Window** | Within twenty-four (24) hours of receipt |
| **Statutory Resolution SLA** | Within thirty (30) calendar days |
| **Registered Application URL** | `https://dawasnap.vercel.app` |
| **Permanent Account Deletion Portal** | `https://dawasnap.vercel.app/delete-account` |

---
*End of Terms of Service Agreement.*
