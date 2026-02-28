import { useState } from 'react';
import { collection, doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import VoiceRecorder from './VoiceRecorder';

const TODAY = new Date().toISOString().slice(0, 10);

export default function BriefingForm({ projectId, userEmail, onSaved }) {
  const [briefingDate, setBriefingDate] = useState(TODAY);
  const [inputMode, setInputMode] = useState('text');
  const [textInput, setTextInput] = useState('');
  const [voiceRecording, setVoiceRecording] = useState(null);
  const [ccPhone, setCcPhone] = useState('');
  const [dispatchName, setDispatchName] = useState('');
  const [dispatchPhone, setDispatchPhone] = useState('');
  const [expectedTrucks, setExpectedTrucks] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const trimmedText = textInput.trim();
      if (inputMode === 'text' && !trimmedText) {
        throw new Error('Please enter briefing text or switch to voice mode.');
      }
      if (inputMode === 'voice' && !voiceRecording) {
        throw new Error('Please record audio before saving.');
      }

      const briefingRef = doc(collection(db, 'briefings'));

      // Build expectedStartTime from briefingDate + startTime
      const startDateTime = new Date(`${briefingDate}T${startTime}:00`);

      let recordingUrl = null;
      let recordingPath = null;
      let recordingMimeType = null;
      let recordingDurationMs = null;

      if (inputMode === 'voice' && voiceRecording) {
        const extension = voiceRecording.mimeType.includes('mp4') ? 'mp4' : 'webm';
        recordingPath = `recordings/${briefingRef.id}/briefing.${extension}`;
        const storageRef = ref(storage, recordingPath);
        await uploadBytes(storageRef, voiceRecording.blob, {
          contentType: voiceRecording.mimeType,
        });
        recordingUrl = await getDownloadURL(storageRef);
        recordingMimeType = voiceRecording.mimeType;
        recordingDurationMs = voiceRecording.durationMs;
      }

      await setDoc(briefingRef, {
        projectId,
        originalInput: inputMode === 'text' ? trimmedText : '',
        inputMode,
        recordingUrl,
        recordingPath,
        recordingMimeType,
        recordingDurationMs,
        transcriptionStatus: inputMode === 'voice' ? 'pending' : null,
        status: 'draft',
        isActive: false,
        briefingDate,
        createdBy: userEmail,
        ccPhone: ccPhone.trim(),
        dispatchName: dispatchName.trim(),
        dispatchPhone: dispatchPhone.trim(),
        expectedTrucks: Number(expectedTrucks) || 0,
        expectedStartTime: Timestamp.fromDate(startDateTime),
        smsSent: false,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      onSaved();
    } catch (err) {
      console.error('Save draft failed:', err);
      setError(err.message || 'Failed to save briefing. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Briefing Date */}
      <div>
        <label htmlFor="briefingDate" className="block text-sm font-medium text-gray-700 mb-1">
          Briefing Date
        </label>
        <input
          id="briefingDate"
          type="date"
          required
          value={briefingDate}
          onChange={(e) => setBriefingDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
        />
      </div>

      {/* Input mode */}
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">Briefing Input Method</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setInputMode('text')}
            className={[
              'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
              inputMode === 'text'
                ? 'border-yellow-400 bg-yellow-50 text-yellow-800'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
            ].join(' ')}
          >
            Type Briefing
          </button>
          <button
            type="button"
            onClick={() => setInputMode('voice')}
            className={[
              'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
              inputMode === 'voice'
                ? 'border-yellow-400 bg-yellow-50 text-yellow-800'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
            ].join(' ')}
          >
            Record Voice
          </button>
        </div>
      </div>

      {/* Briefing Text */}
      <div>
        {inputMode === 'text' ? (
          <>
            <label htmlFor="textInput" className="block text-sm font-medium text-gray-700 mb-1">
              Describe today's work and hazards
            </label>
            <textarea
              id="textInput"
              required={inputMode === 'text'}
              rows={6}
              placeholder="E.g., Paving on eastbound lanes today. Asphalt trucks entering and exiting. Watch for rollers and paving machine..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              AI will rewrite this as a professional safety briefing in Step 3.2.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-700 mb-2">Record a voice note for today's work and hazards.</p>
            <VoiceRecorder value={voiceRecording} onChange={setVoiceRecording} />
            <p className="text-xs text-gray-400 mt-1">
              After saving, this draft is marked transcription pending until Step 3.1 is connected.
            </p>
          </>
        )}
      </div>

      {/* CC Phone */}
      <div>
        <label htmlFor="ccPhone" className="block text-sm font-medium text-gray-700 mb-1">
          Your Phone (CC)
        </label>
        <input
          id="ccPhone"
          type="tel"
          required
          placeholder="416-555-0123"
          value={ccPhone}
          onChange={(e) => setCcPhone(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
        />
      </div>

      {/* Dispatch Name + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="dispatchName" className="block text-sm font-medium text-gray-700 mb-1">
            Dispatch Name
          </label>
          <input
            id="dispatchName"
            type="text"
            required
            value={dispatchName}
            onChange={(e) => setDispatchName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="dispatchPhone" className="block text-sm font-medium text-gray-700 mb-1">
            Dispatch Phone
          </label>
          <input
            id="dispatchPhone"
            type="tel"
            required
            placeholder="416-555-0456"
            value={dispatchPhone}
            onChange={(e) => setDispatchPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
      </div>

      {/* Expected Trucks + Start Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="expectedTrucks" className="block text-sm font-medium text-gray-700 mb-1">
            Expected Trucks
          </label>
          <input
            id="expectedTrucks"
            type="number"
            required
            min="1"
            placeholder="12"
            value={expectedTrucks}
            onChange={(e) => setExpectedTrucks(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
            Expected Start Time
          </label>
          <input
            id="startTime"
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-gray-900 font-semibold py-2.5 rounded-lg transition-colors"
      >
        {saving ? 'Saving...' : 'Save Draft'}
      </button>
    </form>
  );
}
