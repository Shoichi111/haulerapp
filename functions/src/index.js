// Firebase Cloud Functions — Dufferin Safety Briefing App
// All OpenAI API calls and sensitive operations go through these functions.
// API keys are stored as Cloud Functions secrets — never in the browser.

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const OpenAI = require('openai');
const { toFile } = require('openai');

admin.initializeApp();
const db = admin.firestore();

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

// Health check — verifies Cloud Functions are deployed and OPENAI_API_KEY secret is bound
exports.healthCheck = onRequest({ secrets: [OPENAI_API_KEY] }, (req, res) => {
  res.json({
    status: 'ok',
    message: 'Dufferin Safety Briefing Cloud Functions are running.',
    openaiSecretBound: !!OPENAI_API_KEY.value(),
    timestamp: new Date().toISOString(),
  });
});

// Acknowledgement submission — validates fields, checks duplicates, saves to Firestore.
// Deterministic ID ({briefingId}_{unitNumber}_{lastNameLower}) prevents duplicate submissions.
// Server-generated timestamp ensures legal defensibility.
exports.submitAcknowledgement = onCall(async (request) => {
  const data = request.data;

  // 1. Trim and extract fields
  const firstName = (data.firstName || '').trim();
  const lastName = (data.lastName || '').trim();
  const company = (data.company || '').trim();
  const unitNumber = (data.unitNumber || '').trim();
  const phone = (data.phone || '').trim();
  const briefingId = (data.briefingId || '').trim();
  const projectId = (data.projectId || '').trim();
  const briefingVersion = data.briefingVersion;
  const language = (data.language || '').trim();

  // 2. Validate all required fields
  if (!firstName || !lastName || !company || !unitNumber || !phone || !briefingId || !projectId) {
    throw new HttpsError('invalid-argument', 'All fields are required.');
  }
  if (typeof briefingVersion !== 'number') {
    throw new HttpsError('invalid-argument', 'Briefing version is required.');
  }
  if (!['en', 'pu', 'hi'].includes(language)) {
    throw new HttpsError('invalid-argument', 'Invalid language selection.');
  }

  // 3. Generate deterministic ID — same driver + briefing = same doc ID = duplicate rejected
  const ackId = `${briefingId}_${unitNumber}_${lastName.toLowerCase()}`;

  // 4. Write to Firestore — create() fails if document already exists
  try {
    await db.collection('acknowledgements').doc(ackId).create({
      briefingId,
      briefingVersion,
      projectId,
      driverFirstName: firstName,
      driverLastName: lastName,
      company,
      unitNumber,
      phone,
      language,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    if (err.code === 6) {
      throw new HttpsError('already-exists', 'This acknowledgement has already been submitted.');
    }
    console.error('Acknowledgement write failed:', err);
    throw new HttpsError('internal', 'Failed to save acknowledgement. Please try again.');
  }

  return { success: true };
});

// Set admin custom claim + create admins/ doc — bootstraps admin access.
// For POC: called once manually after creating the test CC account in Firebase Auth console.
// After this, user must sign out and back in for the custom claim to take effect.
exports.setAdminClaim = onCall(async (request) => {
  const { uid } = request.data;

  if (!uid || typeof uid !== 'string') {
    throw new HttpsError('invalid-argument', 'A valid UID is required.');
  }

  // For initial bootstrap: allow if no admins exist yet.
  // After that: only existing admins can promote new admins.
  const adminsSnapshot = await db.collection('admins').limit(1).get();
  const hasAdmins = !adminsSnapshot.empty;

  if (hasAdmins) {
    // Verify caller is an existing admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }
    const callerDoc = await db.collection('admins').doc(request.auth.uid).get();
    if (!callerDoc.exists) {
      throw new HttpsError('permission-denied', 'Only admins can set admin claims.');
    }
  }

  // Set custom claim on the target user
  await admin.auth().setCustomUserClaims(uid, { admin: true });

  // Create admins/ document so Firestore security rules work
  await db.collection('admins').doc(uid).set({
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: `Admin claim set for ${uid}. User must sign out and back in.` };
});

// Whisper transcription — downloads voice recording from Storage, sends to OpenAI Whisper,
// writes transcribed text back to the briefing document in Firestore.
exports.transcribeAudio = onCall({ secrets: [OPENAI_API_KEY] }, async (request) => {
  const { briefingId } = request.data;

  if (!briefingId || typeof briefingId !== 'string') {
    throw new HttpsError('invalid-argument', 'briefingId is required.');
  }

  // 1. Read briefing doc
  const briefingDoc = await db.collection('briefings').doc(briefingId).get();
  if (!briefingDoc.exists) {
    throw new HttpsError('not-found', 'Briefing not found.');
  }

  const briefing = briefingDoc.data();
  if (briefing.transcriptionStatus !== 'pending') {
    throw new HttpsError('failed-precondition', 'Briefing is not pending transcription.');
  }
  if (!briefing.recordingPath) {
    throw new HttpsError('failed-precondition', 'No recording path found.');
  }

  // 2. Download audio from Storage
  const bucket = admin.storage().bucket();
  const [buffer] = await bucket.file(briefing.recordingPath).download();

  // 3. Transcribe with Whisper
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
  const filename = briefing.recordingPath.split('/').pop();
  const file = await toFile(buffer, filename);

  const result = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
  });

  // 4. Update Firestore with transcribed text
  await db.collection('briefings').doc(briefingId).update({
    originalInput: result.text,
    transcriptionStatus: 'complete',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, transcription: result.text };
});
