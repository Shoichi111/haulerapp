import { useState } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const TODAY = new Date().toISOString().slice(0, 10);

export default function BriefingForm({ projectId, userEmail, onSaved }) {
  const [briefingDate, setBriefingDate] = useState(TODAY);
  const [textInput, setTextInput] = useState('');
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
      // Build expectedStartTime from briefingDate + startTime
      const startDateTime = new Date(`${briefingDate}T${startTime}:00`);

      await addDoc(collection(db, 'briefings'), {
        projectId,
        originalInput: textInput.trim(),
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
      setError('Failed to save briefing. Please try again.');
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

      {/* Briefing Text */}
      <div>
        <label htmlFor="textInput" className="block text-sm font-medium text-gray-700 mb-1">
          Describe today's work and hazards
        </label>
        <textarea
          id="textInput"
          required
          rows={6}
          placeholder="E.g., Paving on eastbound lanes today. Asphalt trucks entering and exiting. Watch for rollers and paving machine..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
        />
        <p className="text-xs text-gray-400 mt-1">AI will rewrite this as a professional safety briefing in Step 3.2.</p>
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
        {saving ? 'Saving…' : 'Save Draft'}
      </button>
    </form>
  );
}
