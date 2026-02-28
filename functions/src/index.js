// Firebase Cloud Functions — Dufferin Safety Briefing App
// All OpenAI API calls and sensitive operations go through these functions.
// API keys are stored as Cloud Functions secrets — never in the browser.

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

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
