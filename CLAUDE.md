# CLAUDE.md — Dufferin Safety Briefing App

This file gives Claude full context about this project.
Read this before touching any code.

---

## What This App Does

Third-party haul truck drivers arrive at Dufferin Construction job sites without a way to receive a safety briefing. This app solves that.

**Two sides:**

1. **Driver Side (public, no login)** — Driver scans QR code or visits URL → selects project → picks language (English or Punjabi) → taps "Start Briefing" → listens to TTS audio while reading the briefing → views attached PDFs → fills in name/company/unit and acknowledges receipt.

2. **Admin Side (CC login required)** — Construction Coordinator (CC) logs in → creates a daily briefing by speaking or typing → AI rewrites it as a professional safety briefing → publishes it → monitors who has acknowledged → exports acknowledgement records as CSV.

**This is a Proof of Concept (POC)** — proving the concept at one job site before company-wide rollout.

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | React + Vite + Tailwind CSS |
| Database | Firebase Firestore |
| File Storage | Firebase Storage |
| Auth | Firebase Auth (Email/Password) |
| Backend | Firebase Cloud Functions v2 |
| AI Transcription | OpenAI Whisper (via Cloud Function) |
| AI Briefing | OpenAI GPT-4 (via Cloud Function) |
| AI Translation | OpenAI GPT-4 (via Cloud Function) |
| AI Audio | OpenAI TTS API (via Cloud Function) |
| SMS | Twilio (via Cloud Function) |
| Hosting | Firebase Hosting |

---

## CRITICAL: All AI Calls Are Server-Side

**NEVER call OpenAI or Twilio directly from the browser.**
ALL OpenAI API calls go through Firebase Cloud Functions (`functions/`).
The frontend (`src/`) calls Cloud Functions via `src/services/api.js`.
API keys live as Cloud Functions secrets — never in the browser, never in `.env.local`.

---

## Folder Structure

```
haulerapp/
├── src/
│   ├── components/
│   │   ├── driver/          ← ProjectCard, LanguageSelector, AudioPlayer, PDFDocumentList, AcknowledgementForm
│   │   ├── admin/           ← VoiceRecorder, BriefingForm, AcknowledgementTable
│   │   └── shared/          ← LoadingSpinner, ErrorMessage
│   ├── pages/
│   │   ├── driver/          ← HomePage (project list), BriefingPage (full briefing view)
│   │   └── admin/           ← AdminLogin, AdminDashboard, CreateBriefingPage
│   ├── services/
│   │   ├── firebase.js      ← Firebase init (db, storage, auth)
│   │   └── api.js           ← Calls Cloud Functions (NEVER OpenAI directly)
│   ├── hooks/
│   │   └── useAuth.js       ← Auth state for admin route protection
│   ├── App.jsx
│   └── main.jsx
├── functions/
│   └── src/
│       ├── index.js         ← Exports all Cloud Functions
│       ├── briefing.js      ← generateBriefing, translateBriefing (GPT-4)
│       ├── transcription.js ← transcribeAudio (Whisper)
│       ├── tts.js           ← generateTTS (OpenAI TTS)
│       ├── acknowledgement.js ← submitAcknowledgement (validation + duplicate check)
│       └── sms.js           ← checkAndSendSMS (Twilio)
├── public/
├── CLAUDE.md                ← YOU ARE HERE
├── firestore.rules          ← Firestore security rules
├── storage.rules            ← Storage security rules
├── firebase.json
├── .firebaserc
├── .env.local               ← Firebase config ONLY (not in Git)
└── package.json
```

---

## Firestore Collections

### `projects/`
```
{projectId}/
  name: string
  createdAt: timestamp
  isActive: boolean
```

### `briefings/`
```
{briefingId}/
  projectId: string
  originalInput: string           ← CC typed or spoke this
  generatedBriefingEn: string     ← GPT-4 rewrote it in English
  generatedBriefingPu: string     ← GPT-4 translated to Punjabi
  audioUrlEn: string              ← TTS audio URL (English)
  audioUrlPu: string              ← TTS audio URL (Punjabi)
  pdfUrls: [{name, url}]          ← Attached PDFs
  photoUrls: [{name, url}]        ← Attached photos (shown inline on driver side)
  status: 'draft' | 'processing' | 'published' | 'error'
  isActive: boolean               ← Only one active briefing per project
  briefingDate: string            ← YYYY-MM-DD
  createdBy: string               ← CC name
  ccPhone: string                 ← Shown to drivers on acknowledgement form
  dispatchName: string
  dispatchPhone: string
  expectedTrucks: number
  expectedStartTime: timestamp
  smsSent: boolean                ← Prevents duplicate SMS
  version: number
  createdAt: timestamp
  updatedAt: timestamp
```

### `acknowledgements/`
```
{briefingId}_{unitNumber}_{lastNameLower}/   ← DETERMINISTIC ID (prevents duplicates)
  briefingId: string
  briefingVersion: number
  projectId: string
  driverFirstName: string
  driverLastName: string
  company: string
  unitNumber: string
  phone: string
  language: 'en' | 'pu'
  timestamp: timestamp            ← SET BY SERVER, not client
```

### `admins/`
```
{userId}/                         ← UID added manually in Firebase console
  (no fields required — existence = admin access)
```

---

## Key Design Rules

1. **Published briefings are frozen.** Once published, never overwrite content. Updates create a new briefing document (new version). Old versions remain intact.

2. **Atomic publish.** When publishing a new briefing: deactivate the old one AND activate the new one in a single Firestore batch write. Two briefings can never be active simultaneously.

3. **Deterministic acknowledgement IDs.** ID format: `{briefingId}_{unitNumber}_{lastNameLower}`. Firestore prevents duplicate keys — race conditions are impossible.

4. **Server-generated timestamps.** Cloud Function sets `timestamp` on acknowledgements. Drivers cannot forge the time.

5. **Acknowledgement language.** Always use "acknowledged" and "received." Never use "understood" or "comprehended." This is an acknowledgement of receipt, not a comprehension test.

6. **Admin access requires two things:**
   - UID exists in `admins/` collection (Firestore rules check this)
   - `admin: true` custom auth claim set on the account (Storage rules check this)
   Both must be in place. Set up admin accounts via the admin setup checklist.

7. **SMS deduplication.** Cloud Function uses a Firestore transaction to atomically check and set `smsSent`. Duplicate SMS sends are impossible even if two function instances fire simultaneously.

8. **Storage paths:**
   - `published/{briefingId}/` — publicly readable (PDFs + photos + audio for live briefings)
   - `drafts/{briefingId}/` — admin-only (PDFs + photos during briefing creation)
   - `recordings/{briefingId}/` — admin-only (voice recordings for Whisper)
   Draft PDFs and photos are copied to `published/` when briefing is published, then drafts are deleted.

9. **Photo uploads:** CC can attach photos to a briefing (jpg, jpeg, png, webp — max 10MB each). Photos are stored in `drafts/{briefingId}/photos/` and copied to `published/{briefingId}/photos/` on publish. On the driver side, photos appear inline in the briefing view (between briefing text and PDF list). Same frozen/versioning rules apply as PDFs.

---

## Firebase Config

Frontend only needs `.env.local` (Firebase identifiers — NOT secret):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Cloud Functions secrets (stored via Firebase CLI, server-side only):
```
OPENAI_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
```

---

## AI Persona (GPT-4 System Prompt)

Used in `functions/src/briefing.js` when generating safety briefings:

> "You are a senior construction safety professional with over 20 years of hands-on experience managing large civil construction projects in Ontario, Canada, specifically in the Greater Toronto Area. You have deep knowledge of road building, paving, bridge and structure work, culverts, drainage, grading, and general civil infrastructure projects. You are fully versed in the Ontario Occupational Health and Safety Act (OHSA), Ontario Regulation 213/91 (Construction Projects), traffic protection requirements, and all applicable Ministry of Labour standards for construction sites in Ontario.
>
> Your role is to take a brief description of a day's work — provided by a foreman or construction coordinator — and transform it into a professional, structured pre-job safety briefing.
>
> The briefing must:
> - Be written in plain, simple English that anyone can understand, regardless of their construction experience
> - Use short, clear sentences. Avoid jargon. If a term must be used, briefly explain it.
> - Cover: (1) what work is being done today, (2) the key hazards on site, (3) what drivers and workers must do, and (4) what they must NOT do
> - Have an instructional, authoritative tone — as if a safety officer is speaking directly to the workers
> - Be practical and specific to what the foreman described, not generic boilerplate
>
> The goal: a truck driver who has never worked on a construction site before can read or listen to this and know exactly what is happening, what the dangers are, and how to stay safe. Keep it focused and clear. No fluff."

---

## Punjabi Glossary (Used in Translation Prompt)

| English | Punjabi |
|---------|---------|
| Hazard | ਖ਼ਤਰਾ (khatrā) |
| Excavation | ਖੁਦਾਈ (khudāī) |
| Swing radius | ਘੁੰਮਣ ਦਾ ਘੇਰਾ (ghumman dā gherā) |
| Spotter | ਸਪੌਟਰ (spotter) |
| PPE | ਸੁਰੱਖਿਆ ਸਾਜ਼ੋ-ਸਾਮਾਨ (surakkhiā sāzo-sāmān) |

---

## Build Workflow

Full step-by-step build plan: `/Users/mghias/.claude/plans/glistening-swinging-ullman.md`
28 steps across 7 sections. We build one step at a time. Each step must work before the next begins.

### Plan Mode (mandatory)
Before implementing ANY code change — no matter how small — Claude MUST:
1. Call `EnterPlanMode`
2. Explore the codebase and write the plan to the plan file
3. Call `ExitPlanMode` to present the plan for user approval
4. Wait for explicit user approval before writing a single line of code

This applies to every step, every hotfix, every tweak. No exceptions.
Skipping plan mode is a workflow violation.

### Post-Step Audit (mandatory)
After every step's code is written and before the git commit, an independent AI audit agent runs automatically. It:
- Reviews all files created or modified in that step
- Checks for bugs, logic errors, security issues, and deviations from the plan
- Reports findings clearly
- Fixes any issues before the commit is made

No step is committed to Git until it passes the audit.

Current status: Step 0.1 ✅ Step 0.2 ✅ Step 0.3 ✅ Step 0.4 ✅ Step 0.5 ✅ Step 0.6 ✅
