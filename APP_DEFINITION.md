# Dufferin Safety Briefing App — Technical Reference

> Full technical specification: schema, security rules, architecture, and design decisions.
> Read this when you need to understand HOW the app is built, not WHAT to build next.
> For the build steps, see HOW_WE_BUILD_IT.md.

---

## What This App Does

Third-party haul truck drivers arrive at Dufferin Construction job sites without a way to receive a safety briefing. This app solves that by giving Construction Coordinators a dead-simple way to create a daily safety briefing using their voice or by typing, and giving drivers a dead-simple way to read or listen to that briefing in their language (English, Punjabi, or Hindi), and acknowledge it — creating a timestamped legal record.

**This is a Proof of Concept (POC).** It demonstrates the full workflow at one job site. It is not a compliance-ready production system. Future controls (phone verification, advanced audit logging) are planned for rollout.

---

## Tech Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Frontend | React + Vite + Tailwind CSS v4 | UI — `@import "tailwindcss"`, `@tailwindcss/vite` plugin |
| Database | Firebase Firestore | Briefings, projects, acknowledgements |
| File Storage | Firebase Storage | PDFs, voice recordings, TTS audio files, photos |
| Authentication | Firebase Auth (Email/Password) | CC login accounts |
| Backend Logic | Firebase Cloud Functions v2 | ALL OpenAI API calls + SMS trigger |
| AI Transcription | OpenAI Whisper API | Voice note → text |
| AI Briefing | OpenAI GPT-4 | Rewrites input as professional safety briefing |
| AI Translation | OpenAI GPT-4 | English → Punjabi, English → Hindi |
| AI Audio | OpenAI TTS API | Generates audio in English, Punjabi, Hindi |
| SMS | Twilio | Auto-texts dispatch if drivers haven't acknowledged |
| Hosting | Firebase Hosting | Deploys the web app |

---

## CRITICAL: All AI Calls Are Server-Side

**NEVER call OpenAI or Twilio directly from the browser.**

ALL OpenAI API calls go through Firebase Cloud Functions (`functions/src/`).
The frontend (`src/`) calls Cloud Functions via `src/services/api.js`.
API keys live as Cloud Functions secrets — never in `.env.local`, never in the browser.

If you are ever considering adding an OpenAI call to a `src/` file: **stop and route it through a Cloud Function instead.**

---

## Folder Structure

```
haulerapp/
├── src/
│   ├── components/
│   │   ├── driver/
│   │   │   ├── ProjectCard.jsx          ← tappable project card on home screen
│   │   │   ├── LanguageSelector.jsx     ← English / Punjabi / Hindi selection
│   │   │   ├── AudioPlayer.jsx          ← TTS audio player bar (Step 1.4)
│   │   │   ├── PDFDocumentList.jsx      ← tappable list of PDF cards (Step 1.5)
│   │   │   └── AcknowledgementForm.jsx  ← driver form + submit (Step 1.6)
│   │   ├── admin/
│   │   │   ├── VoiceRecorder.jsx        ← mic recording + upload (Step 2.4)
│   │   │   ├── BriefingForm.jsx         ← CC briefing creation form (Step 2.3)
│   │   │   └── AcknowledgementTable.jsx ← live log of acknowledgements (Step 5.1)
│   │   └── shared/
│   │       ├── LoadingSpinner.jsx
│   │       └── ErrorMessage.jsx
│   ├── pages/
│   │   ├── driver/
│   │   │   ├── HomePage.jsx             ← project list (Step 1.1)
│   │   │   └── BriefingPage.jsx         ← progressive container for Steps 1.2–1.6
│   │   └── admin/
│   │       ├── AdminLogin.jsx           ← /admin login (Step 2.1)
│   │       ├── AdminDashboard.jsx       ← CC dashboard (Step 2.2)
│   │       └── CreateBriefingPage.jsx   ← briefing creation (Steps 2.3–2.4)
│   ├── services/
│   │   ├── firebase.js                  ← exports db, storage, auth
│   │   └── api.js                       ← calls Cloud Functions (NEVER OpenAI directly)
│   ├── hooks/
│   │   └── useAuth.js                   ← auth state for admin route protection
│   ├── App.jsx
│   └── main.jsx
├── functions/
│   └── src/
│       ├── index.js                     ← exports all Cloud Functions
│       ├── briefing.js                  ← generateBriefing, translateBriefing (GPT-4)
│       ├── transcription.js             ← transcribeAudio (Whisper)
│       ├── tts.js                       ← generateTTS (OpenAI TTS)
│       ├── acknowledgement.js           ← submitAcknowledgement (validation + duplicate check)
│       └── sms.js                       ← checkAndSendSMS (Twilio)
├── public/
├── CLAUDE.md                            ← Claude workflow rules (lean)
├── APP_DEFINITION.md                    ← YOU ARE HERE (technical reference)
├── HOW_WE_BUILD_IT.md                   ← plain-language 28-step build guide
├── firestore.rules
├── storage.rules
├── firebase.json
├── .firebaserc
├── .env.local                           ← Firebase config only (gitignored)
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
  generatedBriefingHi: string     ← GPT-4 translated to Hindi
  audioUrlEn: string              ← TTS audio URL (English)
  audioUrlPu: string              ← TTS audio URL (Punjabi)
  audioUrlHi: string              ← TTS audio URL (Hindi)
  pdfUrls: [{name, url}]          ← Attached PDFs
  photoUrls: [{name, url}]        ← Attached photos (shown inline on driver side)
  status: 'draft' | 'processing' | 'published' | 'error'
  isActive: boolean               ← Only one active briefing per project at a time
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
{briefingId}_{unitNumber}_{lastNameLower}/   ← DETERMINISTIC ID — prevents duplicates at DB level
  briefingId: string
  briefingVersion: number
  projectId: string
  driverFirstName: string
  driverLastName: string
  company: string
  unitNumber: string
  phone: string
  language: 'en' | 'pu' | 'hi'
  timestamp: timestamp            ← SET BY CLOUD FUNCTION, not client
```

### `admins/`
```
{userId}/                         ← UID added manually in Firebase console
  (no fields required — existence of the document = admin access)
```

---

## Key Design Decisions

1. **Published briefings are frozen.** Once published, never overwrite content. If the CC needs to update, create a new briefing document (new version). Old versions remain intact with all content and acknowledgements.

2. **Atomic publish.** When publishing a new briefing: deactivate the old one AND activate the new one in a single Firestore **batch write**. Two briefings can never be active simultaneously.

3. **Deterministic acknowledgement IDs.** ID format: `{briefingId}_{unitNumber}_{lastNameLower}`. Firestore rejects duplicate document IDs — race conditions are impossible even if two submissions arrive simultaneously.

4. **Server-generated timestamps.** Cloud Function sets `timestamp` on acknowledgements. Drivers cannot forge when they acknowledged. Critical for legal defensibility.

5. **Acknowledgement language.** Always use "acknowledged" and "received." **Never** use "understood" or "comprehended." This is an acknowledgement of receipt, not a comprehension test.

6. **Admin access requires two checks:**
   - UID exists in `admins/` collection → Firestore rules check this
   - `admin: true` custom auth claim set on the account → Storage rules check this (Storage rules cannot query Firestore)
   Both must be in place. After setting the custom claim, the user must sign out and back in.

7. **SMS deduplication.** Cloud Function uses a Firestore **transaction** to atomically check and set `smsSent`. Duplicate SMS sends are impossible even if two scheduler instances fire simultaneously.

8. **Storage paths:**
   - `published/{briefingId}/` — publicly readable (PDFs, photos, audio for live briefings)
   - `drafts/{briefingId}/` — admin-only (files during briefing creation)
   - `recordings/{briefingId}/` — admin-only (voice recordings for Whisper)
   Draft files are copied to `published/` when briefing is published, then drafts are deleted.

9. **Photo uploads:** CC can attach photos to a briefing (jpg, jpeg, png, webp — max 10MB each). On the driver side, photos appear **inline** in the briefing view (between briefing text and PDF list). Same frozen/versioning rules apply.

---

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    match /projects/{projectId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /briefings/{briefingId} {
      allow read: if resource.data.status == 'published' || isAdmin();
      allow write: if isAdmin();
    }

    match /acknowledgements/{ackId} {
      allow create: if false;         // blocked — must go through Cloud Function
      allow read, list: if isAdmin();
      allow update, delete: if false;
    }

    match /admins/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;          // managed manually in Firebase console
    }
  }
}
```

---

## Firebase Storage Security Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /published/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.admin == true
        && request.resource.size < 10 * 1024 * 1024
        && (request.resource.contentType == 'application/pdf'
            || request.resource.contentType.matches('audio/.*')
            || request.resource.contentType.matches('image/.*'));
    }
    match /drafts/{allPaths=**} {
      allow read, write: if request.auth != null
        && request.auth.token.admin == true
        && request.resource.size < 10 * 1024 * 1024;
    }
    match /recordings/{allPaths=**} {
      allow read, write: if request.auth != null
        && request.auth.token.admin == true
        && request.resource.size < 25 * 1024 * 1024;
    }
  }
}
```

---

## Firebase Config

**Frontend `.env.local`** — Firebase identifiers only (NOT secret, but gitignored):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

**Cloud Functions secrets** — stored via Firebase CLI, server-side only:
```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_PHONE_NUMBER
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

## Translation Glossary (Used in Translation Prompt)

When translating to Punjabi or Hindi, provide GPT-4 with this glossary to ensure critical terms are translated correctly:

| English | Punjabi | Hindi |
|---------|---------|-------|
| Hazard | ਖ਼ਤਰਾ (khatrā) | खतरा (khatarā) |
| Excavation | ਖੁਦਾਈ (khudāī) | खुदाई (khudāī) |
| Swing radius | ਘੁੰਮਣ ਦਾ ਘੇਰਾ | घूमने का दायरा |
| Spotter | ਸਪੌਟਰ (spotter) | स्पॉटर (spotter) |
| PPE | ਸੁਰੱਖਿਆ ਸਾਜ਼ੋ-ਸਾਮਾਨ | सुरक्षा उपकरण |
| Acknowledged | ਪ੍ਰਾਪਤ ਕੀਤਾ ਅਤੇ ਪੜ੍ਹਿਆ | प्राप्त किया और पढ़ा |
