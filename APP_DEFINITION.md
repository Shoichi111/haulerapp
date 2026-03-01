# Dufferin Safety Briefing App — Technical Reference

> How the app is built. For build steps, see HOW_WE_BUILD_IT.md.

---

## What This App Does

CCs create daily safety briefings (voice or text) → AI rewrites as professional briefing → translates to English/Punjabi/Hindi → generates TTS audio → drivers read/listen and acknowledge → timestamped legal record created.

**POC** — one job site. Not production-ready yet.

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | React + Vite + Tailwind CSS v4 |
| Database | Firebase Firestore |
| Storage | Firebase Storage |
| Auth | Firebase Auth (Email/Password) |
| Backend | Firebase Cloud Functions v2 |
| AI | OpenAI (Whisper, GPT-4o-mini, TTS) |
| SMS | Twilio |
| Hosting | Firebase Hosting |

---

## CRITICAL: All AI Calls Are Server-Side

**NEVER call OpenAI or Twilio directly from the browser.**
Frontend calls Cloud Functions via `src/services/api.js`. API keys live as Cloud Functions secrets only.

---

## Folder Structure

```
haulerapp/
├── src/
│   ├── components/
│   │   ├── driver/        (ProjectCard, LanguageSelector, AudioPlayer, PDFDocumentList, AcknowledgementForm)
│   │   ├── admin/         (VoiceRecorder, BriefingForm, AcknowledgementTable)
│   │   └── shared/        (LoadingSpinner, ErrorMessage)
│   ├── pages/
│   │   ├── driver/        (HomePage, BriefingPage)
│   │   └── admin/         (AdminLogin, AdminDashboard, CreateBriefingPage)
│   ├── services/          (firebase.js, api.js)
│   ├── hooks/             (useAuth.js)
│   ├── App.jsx
│   └── main.jsx
├── functions/src/
│   ├── index.js           ← exports all Cloud Functions
│   ├── briefing.js        ← generateBriefing, translateBriefing (GPT-4o-mini)
│   ├── transcription.js   ← transcribeAudio (Whisper)
│   ├── tts.js             ← generateTTS (OpenAI TTS)
│   ├── acknowledgement.js ← submitAcknowledgement
│   └── sms.js             ← checkAndSendSMS (Twilio)
├── firestore.rules
├── storage.rules
└── firebase.json
```

---

## Firestore Schema

**projects/** — `name`, `createdAt`, `isActive`

**briefings/** — `projectId`, `originalInput`, `generatedBriefingEn/Pu/Hi`, `audioUrlEn/Pu/Hi`, `pdfUrls [{name,url}]`, `photoUrls [{name,url}]`, `status` (draft|processing|published|error), `isActive`, `briefingDate`, `createdBy`, `ccPhone`, `dispatchName`, `dispatchPhone`, `expectedTrucks`, `expectedStartTime`, `smsSent`, `version`, `createdAt`, `updatedAt`

**acknowledgements/** — ID: `{briefingId}_{unitNumber}_{lastNameLower}` (deterministic). Fields: `briefingId`, `briefingVersion`, `projectId`, `driverFirstName`, `driverLastName`, `company`, `unitNumber`, `phone`, `language`, `timestamp` (server-set)

**admins/** — `{userId}/` — existence = admin access

---

## Key Design Decisions

1. **Published briefings are frozen.** New version = new document. Old versions + acknowledgements stay intact.
2. **Atomic publish.** Deactivate old + activate new in single batch write.
3. **Deterministic ack IDs.** `{briefingId}_{unitNumber}_{lastNameLower}` — no duplicates possible.
4. **Server timestamps.** Cloud Function sets ack timestamp. Legally defensible.
5. **Language:** "acknowledged" and "received" only. Never "understood" or "comprehended."
6. **Admin = two checks:** UID in `admins/` collection (Firestore rules) + `admin: true` custom claim (Storage rules).
7. **SMS dedup.** Transaction atomically checks/sets `smsSent`.
8. **Storage paths:** `published/` (public read), `drafts/` (admin only), `recordings/` (admin only). Drafts copied to published on publish, then deleted.
9. **Photos:** Inline in driver briefing view, between text and PDF list.

---

## AI Persona (GPT-4 System Prompt)

Senior Ontario construction safety professional. Takes CC's rough description → structured pre-job safety briefing. Plain English, short sentences, covers: work today, hazards, what to do, what NOT to do. Authoritative tone. Specific to the described work, not generic.

---

## Translation Glossary

| English | Punjabi | Hindi |
|---------|---------|-------|
| Hazard | ਖ਼ਤਰਾ (khatrā) | खतरा (khatarā) |
| Excavation | ਖੁਦਾਈ (khudāī) | खुदाई (khudāī) |
| Swing radius | ਘੁੰਮਣ ਦਾ ਘੇਰਾ | घूमने का दायरा |
| Spotter | ਸਪੌਟਰ (spotter) | स्पॉटर (spotter) |
| PPE | ਸੁਰੱਖਿਆ ਸਾਜ਼ੋ-ਸਾਮਾਨ | सुरक्षा उपकरण |
| Acknowledged | ਪ੍ਰਾਪਤ ਕੀਤਾ ਅਤੇ ਪੜ੍ਹਿਆ | प्राप्त किया और पढ़ा |

---

## Lessons Learned

- Use `gpt-4o-mini`, not `gpt-4`. Legacy model hits 429 quota errors.
- Deploy from worktree dir, not main repo root.
- Run `npm install` in `functions/` before first deploy from a worktree.
