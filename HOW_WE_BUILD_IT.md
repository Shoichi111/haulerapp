# How We're Building the Dufferin Safety Briefing App

> A plain-language, step-by-step guide to every step involved in building this app.
> Written for someone managing the build, not coding it.

---

## The Big Picture

Two sides to the app:

1. **Driver Side (public)** — No login. Driver scans QR or visits URL → selects project → picks language → taps "Start Briefing" → listens and reads → views attached documents → acknowledges receipt.
2. **Admin Side (CC login required)** — CC logs in → creates briefing by speaking or typing → AI rewrites it as a professional safety briefing → publishes it → monitors who has acknowledged → exports the record.

**This is a Proof of Concept (POC)** — proving the concept at one job site before company-wide rollout.

---

## The Build — 28 Steps Across 7 Sections

---

### Section 0: Foundation (Steps 0.1–0.6) ✅ COMPLETE

**What we did:** Created the project, set up version control, connected Firebase, deployed security rules, stored secrets, and deployed Cloud Functions.

**Step 0.1 — Create the React project** ✅
- Scaffolded React + Vite + Tailwind CSS v4 app
- Installed Firebase SDK and React Router
- Verified app runs in browser

**Step 0.2 — Git setup + CLAUDE.md** ✅
- Git repo initialized on `main` branch
- CLAUDE.md created with full project context
- GitHub repo: https://github.com/Shoichi111/haulerapp
- First commit: `7037e1b`

**Step 0.3 — Connect Firebase** ✅
- Firebase project: `hauler-a0999` (Blaze plan)
- Auth (Email/Password), Firestore, Storage, Hosting enabled
- `.env.local` filled with Firebase config values
- `.firebaserc` set to `hauler-a0999`
- Commit: `b5d3bbd`

**Step 0.4 — Deploy Firestore + Storage security rules** ✅
- `firestore.rules` and `storage.rules` deployed to live project
- Rules verified in Firebase console

**Step 0.5 — Store OpenAI API key** ✅
- OpenAI API key stored in Google Cloud Secret Manager via `firebase functions:secrets:set`
- Key never goes in the repo or `.env.local`

**Step 0.6 — Initialize + Deploy Cloud Functions** ✅
- `functions/` directory set up with `openai` package installed
- Health check function deployed and verified:
  `curl https://us-central1-hauler-a0999.cloudfunctions.net/healthCheck`
  → `{ "status": "ok", "openaiSecretBound": true }`
- Commit: `7563e8d`

---

### Section 1: Driver-Facing Screens (Steps 1.1–1.6)

**What we're doing:** Building everything a driver sees and interacts with. No login required.

---

**Step 1.1 — Project selection screen (Home page)** ✅
- Front page of the app — lists active job site projects as tappable cards
- Fetches `projects` where `isActive == true` from Firestore
- Dufferin branding header, loading/error/empty states
- Seeded test project "Highway 400 North" in Firestore
- **After this step:** Driver sees a clean screen with one project card. Tapping it navigates to the briefing page.
- Commit: `4159f3c`

**Step 1.2 — Language selector** ✅
- When driver taps a project card, they land on `/briefing/:projectId`
- Language selection screen with 3 options: English 🇨🇦, Punjabi 🇮🇳, Hindi 🇮🇳
- English + Punjabi side by side; Hindi full-width below (2+1 grid layout)
- "Start Briefing" button disabled until language selected
- Tapping "Start Briefing" is the required mobile gesture that unlocks audio autoplay
- `BriefingPage` is the progressive container for Steps 1.2–1.6
- **After this step:** Tap project → pick language → tap "Start Briefing" → placeholder shown.
- Commits: `ba035a2` (language selector), `ad2cce1` (Hindi addition)

**Step 1.3 — Briefing view (text)**
- After tapping "Start Briefing", driver sees the full briefing text
- **Text loads instantly** — already in memory from Firestore fetch. Critical for poor signal.
- Real text from `generatedBriefingEn/Pu/Hi` if available; realistic placeholder if not
- Large readable text (`text-base leading-relaxed`) in white card on gray background
- Language badge + date shown above the briefing card
- Yellow "Preview" callout shown when AI text isn't seeded yet — disappears automatically in Step 3.2
- **After this step:** Driver sees a real (or realistic placeholder) safety briefing in their language.
- **Your involvement:** Read the placeholder briefing. Is the text size and layout comfortable on your phone?

**Step 1.4 — TTS audio player**
- When "Start Briefing" is tapped, TTS audio auto-plays (gesture already captured)
- Simple audio bar at top: play/pause, progress bar
- Audio continues as driver scrolls
- Uses `audioUrlEn` or `audioUrlPu` from the briefing doc (or a test audio file)
- Graceful fallback: "Audio unavailable — please read the briefing below."
- **After this step:** Audio plays when briefing opens. Pause/resume works. Scrolling doesn't stop it.
- **Your involvement:** Test on phone with and without headphones. Does audio play reliably?

**Step 1.5 — PDF document list**
- Below the briefing text, a section lists attached PDFs (e.g., "Pre-Work Hazard Assessment")
- Each PDF is a tappable card that opens in a new browser tab
- Photos (if any) appear inline above the PDF list
- Audio keeps playing while PDF is open in another tab
- **After this step:** Tap a document card → PDF opens in a new tab. Switch back — audio still playing.
- **Your involvement:** Test PDF opening on your phone. Does it open cleanly?

**Step 1.6 — Acknowledgement form + submission**
- After the briefing content, the acknowledgement section appears
- Fields: First name, Last name, Company, Unit number, Phone number
- Statement: "By submitting, I acknowledge I have received and reviewed this briefing…"
- Submission goes through a Cloud Function — validates fields, checks duplicates, saves to Firestore
- Deterministic ID prevents duplicate submissions from same driver + briefing
- **After this step:** Fill in form → Submit → "Thank you" confirmation. Re-submit with same info → duplicate rejected.
- **Your involvement:** Submit a test acknowledgement. Try submitting again — it should reject.

---

### Section 2: Admin (CC) Side — Screens (Steps 2.1–2.4)

**What we're doing:** Building the login and briefing creation screens for Construction Coordinators.

---

**Step 2.1 — Admin login screen**
- Login page at `/admin` — email + password via Firebase Auth
- One test CC account created manually in Firebase console
- Cloud Function sets `admin: true` custom claim on the account
- After custom claim is set, user must sign out and back in (Firebase requirement)
- **After this step:** Go to `/admin` → log in → placeholder dashboard. Sign out and back in works.
- **Your involvement:** Create the test CC account in Firebase console (I give exact instructions). Sign out and back in once after I set the claim.

**Step 2.2 — Admin dashboard**
- Shows current published briefing for the POC job site
- Shows acknowledgement count vs expected trucks (e.g., "7 of 12 drivers acknowledged")
- Buttons: Create new briefing, Unpublish current briefing, View acknowledgement log
- "Proof of Concept" label visible
- **After this step:** Log in → see dashboard with live data. Unpublish button hides briefing from driver side.

**Step 2.3 — Create briefing form (text input)**
- CC fills in: Project, Briefing date, Text input (or voice — Step 2.4), CC phone, Dispatch contacts, Expected trucks, Expected start time
- "Generate Briefing" button saves draft to Firestore
- **After this step:** Fill out form → tap Generate → saves as draft (AI connects in Step 3.2).
- **Your involvement:** Fill out form as a real CC would. Tell me if any fields are confusing.

**Step 2.4 — Voice recording**
- Toggle switches briefing form between text input and voice recording
- CC taps mic → records → taps stop → uploaded to Firebase Storage
- Handles Chrome (webm) and Safari (mp4) formats automatically
- **After this step:** Record → save → audio saved. Text area shows "Transcription pending…"
- **Your involvement:** Test on phone and computer browser. Test on Safari if available.

---

### Section 3: AI Integration (Steps 3.1–3.4)

**What we're doing:** Connecting OpenAI through Cloud Functions. All AI calls are server-side.

---

**Step 3.1 — Whisper transcription**
- Voice recording sent to Cloud Function → Whisper API → transcribed text appears in form
- **After this step:** Record voice → tap Generate → see transcription appear automatically.
- **Your involvement:** Record a simple job description. Check Whisper got it right.

**Step 3.2 — GPT-4 briefing generation**
- Transcribed/typed text sent to Cloud Function → GPT-4 with Ontario construction safety persona → professional briefing
- Status: `draft` → `processing` → `draft` (with content) or `error`
- CC sees preview, can approve, edit, or retry
- **After this step:** Your rough input becomes a structured professional safety briefing.
- **Your involvement:** Most important test. Read the generated briefing. Does it sound right?

**Step 3.3 — Punjabi + Hindi translation**
- Once English approved, Cloud Function calls GPT-4 to translate to Punjabi and Hindi
- All versions saved to Firestore (`generatedBriefingEn`, `generatedBriefingPu`, `generatedBriefingHi`)
- **After this step:** Briefing exists in all 3 languages. Switch language in driver view — all work.
- **Your involvement:** If you know someone who reads Punjabi or Hindi, ask them to review.

**Step 3.4 — TTS audio generation (English + Punjabi + Hindi)**
- Cloud Function calls OpenAI TTS to generate audio for all 3 language briefings
- Audio stored in Firebase Storage at `published/{briefingId}/audio/en.mp3`, `pu.mp3`, `hi.mp3`
- URLs written back to Firestore briefing document
- Generated ONCE on publish, served to ALL drivers
- **After this step:** Select language → tap Start Briefing → real TTS audio plays in that language.
- **Your involvement:** Listen to all 3 audio versions. Is the voice clear? Is the pacing right?

---

### Section 4: PDF Upload (Steps 4.1–4.2)

**What we're doing:** Letting CCs attach real construction documents for drivers to view.

---

**Step 4.1 — PDF + Photo upload on admin side**
- Two upload areas on briefing form: PDFs (max 10MB each) + Photos (jpg/png/webp, max 10MB each)
- PDFs stored at `drafts/{briefingId}/pdfs/`, photos at `drafts/{briefingId}/photos/`
- Copied to `published/` on publish; drafts deleted
- File names/thumbnails shown in form so CC confirms correct files
- **After this step:** Upload a PDF and a photo. Both appear in the form. Wrong file type → rejected.

**Step 4.2 — PDF + Photo display on driver side**
- Photos appear inline in the briefing view (between text and PDF list)
- PDFs appear as tappable cards below — tap to open in new browser tab
- Audio keeps playing while viewing photos or PDFs
- **After this step:** Full end-to-end: briefing has photo inline + PDF card → both open correctly.

---

### Section 5: Acknowledgement System (Steps 5.1–5.2)

---

**Step 5.1 — Acknowledgement log on admin dashboard**
- Table: driver name, company, unit number, phone, language, timestamp
- Live count: "9 of 12 drivers acknowledged" — updates in real-time
- **After this step:** Submit test acknowledgement as driver → immediately appears in CC dashboard.
- **Your involvement:** Test real-time update. Does count update without refreshing?

**Step 5.2 — CSV export**
- "Download Acknowledgement Report" button on dashboard
- CSV includes: date, briefing version, driver name, company, unit, phone, language, timestamp
- **After this step:** Click export → open in Excel/Numbers. Does it look clean enough for a safety audit?
- **Your involvement:** Open the CSV. Imagine showing it to management. Tell me if any column is missing.

---

### Section 6: SMS Notifications (Steps 6.1–6.3)

---

**Step 6.1 — Twilio setup + Cloud Function**
- Store Twilio credentials as Cloud Function secrets
- Cloud Function that can send an SMS to a phone number
- Test by manually triggering to your own phone
- **Your involvement:** Sign up for Twilio and provide Account SID, Auth Token, phone number.

**Step 6.2 — Scheduled trigger logic**
- Cloud Function runs every 15 minutes: checks for briefings where `expectedStartTime + 2hrs` has passed AND `smsSent == false`
- **Your involvement:** Watch Firebase logs. Confirm function triggered correctly.

**Step 6.3 — Automatic SMS to dispatch**
- If acknowledgements incomplete at trigger time: SMS sent to dispatch contact(s)
- Message: "Hi [Dispatch Name], this is Dufferin Construction. [X] of your [Y] expected drivers on [Project Name] have not yet acknowledged today's safety briefing. Please remind them to complete the briefing at: [URL]. Thank you."
- `smsSent` set to true — only one SMS per briefing ever sent
- **Your involvement:** Use your own phone number as dispatch for testing. Read the SMS. Is it professional?

---

### Section 7: Polish, Testing & Deployment (Steps 7.1–7.5)

---

**Step 7.1 — Loading states + error handling**
- Spinners for: AI generation, audio loading, PDF loading, form submission
- Friendly error messages if something fails
- If AI generation fails: briefing shows `error` status with "Retry" button
- If driver submission fails: form preserved so they can retry

**Step 7.2 — Mobile responsiveness + full end-to-end test**
- Test every screen on iPhone and Android
- Run complete flow: CC creates briefing → driver reviews → driver acknowledges → CC exports → SMS sends
- **Your involvement:** This is the critical test. Do the full flow as if showing it to management tomorrow.

**Step 7.3 — QR code generation**
- "Print QR Code" button on admin dashboard
- Generates QR linking to the project's briefing page
- CC prints it and puts it in driver dashboards
- **Your involvement:** Print and scan the QR code. Does it take you straight to the briefing?

**Step 7.4 — Documentation finalization**
- Finalize all documentation files
- Add comments to critical code sections
- **After this step:** Anyone can pick up this project and understand it immediately.

**Step 7.5 — Deploy to Firebase Hosting** ← **MVP COMPLETE**
- Build production version → deploy to Firebase Hosting
- App is live at `haulerapp.web.app`
- Test live URL on multiple phones
- **Your involvement:** Open live URL on your phone and a colleague's phone. Run the full flow one more time.

---

## How We Work Together

1. **You say** which step to build (e.g., "next step")
2. **I plan it** — enter plan mode, explore codebase, write plan, wait for your approval
3. **I build it** — explain what I did in plain language
4. **You test it** — I tell you exactly what to check on your phone or browser
5. **If it works** — tell me to move to the next step
6. **If something's wrong** — tell me what happened, I fix it
7. **After each working step** — audit runs, then git commit with clear message

**You are the manager. I am the builder. Nothing happens without your go-ahead.**

---

## What You'll Need To Do Yourself

| Task | Step |
|------|------|
| Create test CC account in Firebase console | 2.1 |
| Sign up for Twilio | 6.1 |
| Test on your phone after every step | Every step |
| Review AI briefing quality | 3.2 |
| Review Punjabi/Hindi translation | 3.3 |

---

## Cost Summary (Monthly)

| Service | MVP Cost |
|---------|----------|
| Firebase (all services) | $0 (free tier covers POC) |
| OpenAI API | ~$3–5/month |
| Twilio SMS | ~$2–3/month |
| **Total** | **~$5–8/month** |
