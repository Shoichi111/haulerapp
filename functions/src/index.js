// Firebase Cloud Functions — Dufferin Safety Briefing App
// All OpenAI API calls and sensitive operations go through these functions.
// API keys are stored as Cloud Functions secrets — never in the browser.

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

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
