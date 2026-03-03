import { useState } from 'react';
import { collection, doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import { transcribeAudio, generateBriefing, generateTTS } from '../../services/api';
import VoiceRecorder from './VoiceRecorder';

const TODAY = new Date().toISOString().slice(0, 10);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_PDF_TYPES = ['application/pdf'];
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
  const [pdfFiles, setPdfFiles] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState('');
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

      // Upload PDFs to drafts/{briefingId}/pdfs/
      setSavingStatus('Uploading files...');
      const uploadedPdfs = [];
      for (const file of pdfFiles) {
        const path = `drafts/${briefingRef.id}/pdfs/${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file, { contentType: file.type });
        const url = await getDownloadURL(storageRef);
        uploadedPdfs.push({ name: file.name, url });
      }

      // Upload photos to drafts/{briefingId}/photos/
      const uploadedPhotos = [];
      for (const file of photoFiles) {
        const path = `drafts/${briefingRef.id}/photos/${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file, { contentType: file.type });
        const url = await getDownloadURL(storageRef);
        uploadedPhotos.push({ name: file.name, url });
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
        pdfUrls: uploadedPdfs,
        photoUrls: uploadedPhotos,
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

      // Transcribe voice recording before generating
      if (inputMode === 'voice') {
        setSavingStatus('Transcribing voice...');
        await transcribeAudio({ briefingId: briefingRef.id });
      }

      // Generate English briefing + auto-translate to Punjabi/Hindi
      setSavingStatus('Generating briefing...');
      await generateBriefing({ briefingId: briefingRef.id });

      // Generate TTS audio for all 3 languages
      setSavingStatus('Generating audio...');
      await generateTTS({ briefingId: briefingRef.id });

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
              AI will rewrite this as a professional safety briefing.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-700 mb-2">Record a voice note for today's work and hazards.</p>
            <VoiceRecorder value={voiceRecording} onChange={setVoiceRecording} />
            <p className="text-xs text-gray-400 mt-1">
              After saving, your recording will be automatically transcribed.
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

      {/* PDF Attachments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          PDF Attachments <span className="text-gray-400 font-normal">(optional, max 10MB each)</span>
        </label>
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            const invalid = files.find(f => !ALLOWED_PDF_TYPES.includes(f.type));
            if (invalid) {
              setError(`"${invalid.name}" is not a PDF file.`);
              e.target.value = '';
              return;
            }
            const tooBig = files.find(f => f.size > MAX_FILE_SIZE);
            if (tooBig) {
              setError(`"${tooBig.name}" exceeds 10MB limit.`);
              e.target.value = '';
              return;
            }
            setError('');
            setPdfFiles(files);
          }}
          className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
        {pdfFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            {pdfFiles.map((f, i) => (
              <p key={i} className="text-xs text-gray-500 flex items-center gap-1">
                <span className="text-red-500">📄</span> {f.name} <span className="text-gray-400">({(f.size / 1024 / 1024).toFixed(1)}MB)</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Photo Attachments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Site Photos <span className="text-gray-400 font-normal">(optional, jpg/png/webp, max 10MB each)</span>
        </label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            const invalid = files.find(f => !ALLOWED_PHOTO_TYPES.includes(f.type));
            if (invalid) {
              setError(`"${invalid.name}" is not a supported image (jpg, png, webp).`);
              e.target.value = '';
              return;
            }
            const tooBig = files.find(f => f.size > MAX_FILE_SIZE);
            if (tooBig) {
              setError(`"${tooBig.name}" exceeds 10MB limit.`);
              e.target.value = '';
              return;
            }
            setError('');
            setPhotoFiles(files);
          }}
          className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
        {photoFiles.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {photoFiles.map((f, i) => (
              <div key={i} className="relative">
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="w-full h-20 object-cover rounded-lg border border-gray-200"
                />
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{f.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-gray-900 font-semibold py-2.5 rounded-lg transition-colors"
      >
        {saving ? (savingStatus || 'Saving...') : 'Save Draft'}
      </button>
    </form>
  );
}
