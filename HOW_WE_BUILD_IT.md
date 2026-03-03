# How We're Building the Dufferin Safety Briefing App

> Step-by-step build guide. For technical reference, see APP_DEFINITION.md.

---

## Completed Sections

**Section 0: Foundation (0.1–0.6)** — React+Vite+Tailwind scaffolded, Git+GitHub, Firebase connected (hauler-a0999), security rules deployed, OpenAI secret stored, Cloud Functions deployed with health check.

**Section 1: Driver Screens (1.1–1.6)** — Home page with project cards, language selector (EN/PU/HI), briefing text view, TTS audio player, PDF document list, acknowledgement form + Cloud Function submission with deterministic IDs.

**Section 2: Admin Screens (2.1–2.4)** — Admin login with custom claims, dashboard with live ack count, briefing creation form, voice recorder (Chrome webm + Safari mp4).

**Section 3: AI Integration (3.1–3.4)** — Whisper transcription, GPT-4o-mini briefing generation + translation (EN/PU/HI), TTS audio generation (alloy/shimmer voices), auto-publish after TTS completes.

**Section 4: PDF + Photo Upload (4.1–4.2)** — Admin uploads PDFs + photos on briefing form (validated, max 10MB). Driver sees photos inline (2-col grid) + PDF tappable cards. Opens in new tab so audio keeps playing.

---

## Upcoming: Section 5 — Acknowledgement System (5.1–5.2)

**Step 5.1 — Acknowledgement log on admin dashboard**
- Table: driver name, company, unit number, phone, language, timestamp
- Live count: "9 of 12 drivers acknowledged" — real-time updates
- **Test:** Submit ack as driver → immediately appears in CC dashboard.

**Step 5.2 — CSV export**
- Download button → CSV with date, version, driver name, company, unit, phone, language, timestamp
- **Test:** Open in Excel. Clean enough for safety audit?

---

## Upcoming: Section 6 — SMS Notifications (6.1–6.3)

**Step 6.1 — Twilio setup + Cloud Function**
- Store Twilio creds as secrets. Cloud Function sends SMS. Test to own phone.
- **User action:** Sign up for Twilio, provide Account SID, Auth Token, phone number.

**Step 6.2 — Scheduled trigger logic**
- Cloud Function runs every 15 min: checks briefings where `expectedStartTime + 2hrs` passed AND `smsSent == false`.

**Step 6.3 — Automatic SMS to dispatch**
- If acks incomplete → SMS to dispatch. `smsSent` set to true (one SMS per briefing ever).

---

## Upcoming: Section 7 — Polish & Deploy (7.1–7.5)

**Step 7.1** — Loading states + error handling (spinners, retry buttons, form preservation)
**Step 7.2** — Mobile responsiveness + full end-to-end test
**Step 7.3** — QR code generation (print for driver dashboards)
**Step 7.4** — Documentation finalization
**Step 7.5** — Deploy to Firebase Hosting → live at `haulerapp.web.app` ← **MVP COMPLETE**

---

## How We Work Together

1. You say which step to build
2. I plan it → wait for approval
3. I build it → explain in plain language
4. You test it → I tell you exactly what to check
5. Works → next step. Broken → I fix it.
6. After each step → audit + git commit

**You are the manager. I am the builder.**

---

## User Actions Required

| Task | Step |
|------|------|
| Sign up for Twilio | 6.1 |
| Test on phone after every step | Every step |
| Review AI briefing quality | 3.2 ✅ |
| Review Punjabi/Hindi translation | 3.3 ✅ |
| Listen to TTS audio | 3.4 ✅ |
