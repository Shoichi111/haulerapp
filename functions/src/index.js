// Firebase Cloud Functions — Dufferin Safety Briefing App
// All OpenAI API calls and sensitive operations go through these functions.
// API keys are stored as Cloud Functions secrets — never in the browser.

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const OpenAI = require('openai');

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
exports.transcribeAudio = onCall({ secrets: [OPENAI_API_KEY], timeoutSeconds: 120 }, async (request) => {
  const { briefingId } = request.data;
  console.log('transcribeAudio called', { briefingId });

  if (!briefingId || typeof briefingId !== 'string') {
    throw new HttpsError('invalid-argument', 'briefingId is required.');
  }

  try {
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
    console.log('Downloading audio from', briefing.recordingPath);
    const bucket = admin.storage().bucket();
    const [buffer] = await bucket.file(briefing.recordingPath).download();
    console.log('Downloaded', buffer.length, 'bytes');

    // 3. Transcribe with Whisper (use native File instead of toFile)
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
    const filename = briefing.recordingPath.split('/').pop();
    const mimeType = briefing.recordingMimeType || 'audio/webm';
    const file = new File([buffer], filename, { type: mimeType });

    console.log('Sending to Whisper', { filename, mimeType, size: buffer.length });
    const result = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });
    console.log('Transcription complete', { textLength: result.text.length });

    // 4. Update Firestore with transcribed text
    await db.collection('briefings').doc(briefingId).update({
      originalInput: result.text,
      transcriptionStatus: 'complete',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, transcription: result.text };
  } catch (err) {
    console.error('transcribeAudio failed:', err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', 'Transcription failed. Please try again.');
  }
});

// Shared helper — translates English briefing text to Punjabi and Hindi in parallel.
async function translateTexts(openai, englishText) {
  const systemPromptFor = (lang) =>
    `Translate this construction site safety briefing to ${lang}. Keep the same structure and formatting including any bullet points. Use natural conversational language that construction workers would understand.`;

  const [punjabi, hindi] = await Promise.all([
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPromptFor('Punjabi') },
        { role: 'user', content: englishText },
      ],
    }),
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPromptFor('Hindi') },
        { role: 'user', content: englishText },
      ],
    }),
  ]);

  return {
    punjabi: punjabi.choices[0].message.content,
    hindi: hindi.choices[0].message.content,
  };
}

// Generate briefing — rewrites CC's raw input as a professional English safety briefing,
// then auto-translates to Punjabi and Hindi. Three GPT-4 calls total.
exports.generateBriefing = onCall({ secrets: [OPENAI_API_KEY], timeoutSeconds: 120 }, async (request) => {
  const { briefingId } = request.data;
  console.log('generateBriefing called', { briefingId });

  if (!briefingId || typeof briefingId !== 'string') {
    throw new HttpsError('invalid-argument', 'briefingId is required.');
  }

  try {
    // 1. Read briefing doc
    const briefingDoc = await db.collection('briefings').doc(briefingId).get();
    if (!briefingDoc.exists) {
      throw new HttpsError('not-found', 'Briefing not found.');
    }

    const briefing = briefingDoc.data();
    if (!briefing.originalInput || !briefing.originalInput.trim()) {
      throw new HttpsError('failed-precondition', 'No original input text found.');
    }

    // 2. Generate professional English briefing via GPT-4
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
    console.log('Generating English briefing', { inputLength: briefing.originalInput.length });

    const englishResult = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a construction site safety coordinator. Rewrite the following rough notes into a clear, professional safety briefing for truck drivers arriving at a construction site. Use bullet points for key hazards and instructions. Keep it concise but thorough. Include any site-specific details mentioned.',
        },
        { role: 'user', content: briefing.originalInput },
      ],
    });

    const englishBriefing = englishResult.choices[0].message.content;
    console.log('English briefing generated', { length: englishBriefing.length });

    // 3. Translate to Punjabi and Hindi in parallel
    console.log('Translating to Punjabi and Hindi');
    const translations = await translateTexts(openai, englishBriefing);
    console.log('Translations complete', {
      punjabiLength: translations.punjabi.length,
      hindiLength: translations.hindi.length,
    });

    // 4. Save all three versions to Firestore
    await db.collection('briefings').doc(briefingId).update({
      generatedBriefingEn: englishBriefing,
      generatedBriefingPu: translations.punjabi,
      generatedBriefingHi: translations.hindi,
      status: 'generated',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (err) {
    console.error('generateBriefing failed:', err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', 'Briefing generation failed. Please try again.');
  }
});

// TTS audio generation — generates MP3 audio for all 3 languages using OpenAI TTS.
// Audio files stored at published/{briefingId}/audio/en.mp3, pu.mp3, hi.mp3.
// URLs written back to Firestore. Generated ONCE on publish, served to ALL drivers.
exports.generateTTS = onCall({ secrets: [OPENAI_API_KEY], timeoutSeconds: 300 }, async (request) => {
  const { briefingId } = request.data;
  console.log('generateTTS called', { briefingId });

  if (!briefingId || typeof briefingId !== 'string') {
    throw new HttpsError('invalid-argument', 'briefingId is required.');
  }

  try {
    // 1. Read briefing doc
    const briefingDoc = await db.collection('briefings').doc(briefingId).get();
    if (!briefingDoc.exists) {
      throw new HttpsError('not-found', 'Briefing not found.');
    }

    const briefing = briefingDoc.data();
    const texts = {
      en: briefing.generatedBriefingEn,
      pu: briefing.generatedBriefingPu,
      hi: briefing.generatedBriefingHi,
    };

    // Verify all 3 language texts exist
    for (const [lang, text] of Object.entries(texts)) {
      if (!text || !text.trim()) {
        throw new HttpsError('failed-precondition', `Missing ${lang} briefing text. Generate briefing first.`);
      }
    }

    // 2. Generate TTS audio for all 3 languages in parallel
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
    const bucket = admin.storage().bucket();

    // Voice selection: English gets 'alloy', Punjabi and Hindi get 'shimmer' (clearer for South Asian languages)
    const voiceMap = { en: 'alloy', pu: 'shimmer', hi: 'shimmer' };

    const ttsResults = await Promise.all(
      Object.entries(texts).map(async ([lang, text]) => {
        console.log(`Generating TTS for ${lang}`, { textLength: text.length });

        const response = await openai.audio.speech.create({
          model: 'tts-1',
          voice: voiceMap[lang],
          input: text,
          response_format: 'mp3',
        });

        // Convert response to buffer and upload to Storage
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const storagePath = `published/${briefingId}/audio/${lang}.mp3`;
        const file = bucket.file(storagePath);

        // Generate a unique download token for this file
        const downloadToken = require('crypto').randomUUID();
        await file.save(buffer, {
          metadata: {
            contentType: 'audio/mpeg',
            metadata: { firebaseStorageDownloadTokens: downloadToken },
          },
        });

        // Build Firebase Storage download URL
        const encodedPath = encodeURIComponent(storagePath);
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

        console.log(`TTS ${lang} complete`, { size: buffer.length, path: storagePath });
        return { lang, url: publicUrl };
      })
    );

    // 3. Write audio URLs back to Firestore
    const audioUrls = {};
    for (const { lang, url } of ttsResults) {
      const fieldName = `audioUrl${lang === 'en' ? 'En' : lang === 'pu' ? 'Pu' : 'Hi'}`;
      audioUrls[fieldName] = url;
    }

    // 4. Atomic publish — activate new briefing + deactivate old one in a batch
    const briefingRef = db.collection('briefings').doc(briefingId);
    const projectId = briefing.projectId;

    // Find any currently active briefing for this project (to deactivate)
    const activeSnap = await db.collection('briefings')
      .where('projectId', '==', projectId)
      .where('isActive', '==', true)
      .get();

    const batch = db.batch();

    // Deactivate old active briefing(s)
    activeSnap.docs.forEach((doc) => {
      if (doc.id !== briefingId) {
        batch.update(doc.ref, { isActive: false });
      }
    });

    // Activate + publish the new briefing with audio URLs
    batch.update(briefingRef, {
      ...audioUrls,
      status: 'published',
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    console.log('All TTS audio generated, briefing published', { briefingId, projectId });
    return { success: true };
  } catch (err) {
    console.error('generateTTS failed:', err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', 'TTS audio generation failed. Please try again.');
  }
});

// Re-translate — reads existing English briefing and re-translates to Punjabi and Hindi.
// Useful if the English text was edited after initial generation.
exports.translateBriefing = onCall({ secrets: [OPENAI_API_KEY], timeoutSeconds: 120 }, async (request) => {
  const { briefingId } = request.data;
  console.log('translateBriefing called', { briefingId });

  if (!briefingId || typeof briefingId !== 'string') {
    throw new HttpsError('invalid-argument', 'briefingId is required.');
  }

  try {
    const briefingDoc = await db.collection('briefings').doc(briefingId).get();
    if (!briefingDoc.exists) {
      throw new HttpsError('not-found', 'Briefing not found.');
    }

    const briefing = briefingDoc.data();
    if (!briefing.generatedBriefingEn || !briefing.generatedBriefingEn.trim()) {
      throw new HttpsError('failed-precondition', 'No English briefing found. Generate the briefing first.');
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
    const translations = await translateTexts(openai, briefing.generatedBriefingEn);

    await db.collection('briefings').doc(briefingId).update({
      generatedBriefingPu: translations.punjabi,
      generatedBriefingHi: translations.hindi,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (err) {
    console.error('translateBriefing failed:', err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', 'Translation failed. Please try again.');
  }
});
