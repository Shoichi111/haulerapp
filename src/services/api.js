// API service — all calls to Cloud Functions go through this file.
// IMPORTANT: OpenAI, Twilio, and all secrets live in Cloud Functions.
//            Never call OpenAI or Twilio directly from this file.

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

const functions = getFunctions(app);

// Health check — verify Cloud Functions are deployed and responding
export const healthCheck = httpsCallable(functions, 'healthCheck');

// Briefing generation — sends CC input to GPT-4 via Cloud Function
export const generateBriefing = httpsCallable(functions, 'generateBriefing');

// Audio transcription — sends voice recording to Whisper via Cloud Function
export const transcribeAudio = httpsCallable(functions, 'transcribeAudio');

// Acknowledgement submission — validates + saves to Firestore via Cloud Function
export const submitAcknowledgement = httpsCallable(functions, 'submitAcknowledgement');

// Set admin custom claim — bootstraps first admin or promotes new admins
export const setAdminClaim = httpsCallable(functions, 'setAdminClaim');
