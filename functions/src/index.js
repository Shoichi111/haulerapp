// Firebase Cloud Functions — Dufferin Safety Briefing App
// All OpenAI API calls and sensitive operations go through these functions.
// API keys are stored as Cloud Functions secrets — never in the browser.

const { onRequest } = require('firebase-functions/v2/https');

// Health check — used to verify Cloud Functions are deployed and working
exports.healthCheck = onRequest((req, res) => {
  res.json({
    status: 'ok',
    message: 'Dufferin Safety Briefing Cloud Functions are running.',
    timestamp: new Date().toISOString(),
  });
});
