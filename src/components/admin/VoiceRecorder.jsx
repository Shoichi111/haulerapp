import { useEffect, useMemo, useRef, useState } from 'react';

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
];

function pickSupportedMimeType() {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
    return '';
  }
  for (const candidate of MIME_CANDIDATES) {
    if (window.MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return '';
}

export default function VoiceRecorder({ value, onChange }) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [durationMs, setDurationMs] = useState(value?.durationMs ?? 0);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);

  const isSupported = useMemo(() => {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined'
    );
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (value?.previewUrl) {
        URL.revokeObjectURL(value.previewUrl);
      }
    };
    // Cleanup should run only on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    setError('');
    if (!isSupported) {
      setError('Voice recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blobType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        const previewUrl = URL.createObjectURL(blob);
        const elapsed = Date.now() - startedAtRef.current;

        setDurationMs(elapsed);
        onChange({
          blob,
          mimeType: blobType,
          durationMs: elapsed,
          previewUrl,
        });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access failed:', err);
      setError('Microphone access was denied. Please allow access and try again.');
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
    setIsRecording(false);
  }

  function clearRecording() {
    if (value?.previewUrl) {
      URL.revokeObjectURL(value.previewUrl);
    }
    setDurationMs(0);
    onChange(null);
  }

  function formatDuration(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const sec = String(totalSec % 60).padStart(2, '0');
    return `${min}:${sec}`;
  }

  return (
    <div className="space-y-3">
      {!isSupported && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          This browser does not support voice recording. Use typed input instead.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!isRecording && !value && (
        <button
          type="button"
          onClick={startRecording}
          disabled={!isSupported}
          className="w-full bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-800 font-semibold py-2.5 rounded-lg transition-colors"
        >
          Start Recording
        </button>
      )}

      {isRecording && (
        <button
          type="button"
          onClick={stopRecording}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          Stop Recording
        </button>
      )}

      {value && (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
          <p className="text-sm text-gray-700">
            Recording ready ({formatDuration(durationMs)}).
          </p>
          <audio controls src={value.previewUrl} className="w-full" />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={clearRecording}
              className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium text-sm py-2 rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={startRecording}
              className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium text-sm py-2 rounded-lg transition-colors"
            >
              Re-record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
