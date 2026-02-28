// AcknowledgementForm — driver fills in their info and submits to create a
// timestamped legal record. Submission goes through a Cloud Function that
// validates fields and uses a deterministic ID to prevent duplicates.

import { useState } from 'react'
import { submitAcknowledgement } from '../../services/api'

const FIELDS = [
  { key: 'firstName',  label: 'First Name',  placeholder: 'Enter your first name', type: 'text',  inputMode: 'text' },
  { key: 'lastName',   label: 'Last Name',   placeholder: 'Enter your last name',  type: 'text',  inputMode: 'text' },
  { key: 'company',    label: 'Company',      placeholder: 'Your trucking company', type: 'text',  inputMode: 'text' },
  { key: 'unitNumber', label: 'Unit Number',  placeholder: 'Truck or unit number',  type: 'text',  inputMode: 'text' },
  { key: 'phone',      label: 'Phone Number', placeholder: '(416) 555-0123',        type: 'tel',   inputMode: 'tel' },
]

export default function AcknowledgementForm({ briefingId, briefingVersion, projectId, selectedLanguage }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    company: '',
    unitNumber: '',
    phone: '',
  })
  const [status, setStatus] = useState('idle') // idle | submitting | success | duplicate | error
  const [errorMessage, setErrorMessage] = useState('')

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    // Client-side validation (UX only — server is authoritative)
    const { firstName, lastName, company, unitNumber, phone } = form
    if (!firstName.trim() || !lastName.trim() || !company.trim() || !unitNumber.trim() || !phone.trim()) {
      setErrorMessage('All fields are required.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorMessage('')

    try {
      await submitAcknowledgement({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim(),
        unitNumber: unitNumber.trim(),
        phone: phone.trim(),
        briefingId,
        briefingVersion,
        projectId,
        language: selectedLanguage,
      })
      setStatus('success')
    } catch (err) {
      if (err.code === 'functions/already-exists') {
        setStatus('duplicate')
      } else {
        setErrorMessage('Something went wrong. Please try again.')
        setStatus('error')
      }
    }
  }

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Acknowledgement
      </h3>

      <div className="bg-white border border-gray-200 rounded-2xl px-6 py-6">

        {/* Success state */}
        {status === 'success' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-lg font-bold text-gray-900">Thank You</p>
            <p className="text-sm text-gray-500 mt-1">Your acknowledgement has been recorded.</p>
          </div>
        )}

        {/* Duplicate state */}
        {status === 'duplicate' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-lg font-bold text-gray-900">Already Submitted</p>
            <p className="text-sm text-gray-500 mt-1">You have already acknowledged this briefing.</p>
          </div>
        )}

        {/* Form state (idle, submitting, error) */}
        {status !== 'success' && status !== 'duplicate' && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    inputMode={f.inputMode}
                    value={form[f.key]}
                    onChange={e => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    disabled={status === 'submitting'}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              ))}
            </div>

            {/* Legal statement */}
            <p className="text-xs text-gray-500 mt-5 leading-relaxed">
              By submitting, I acknowledge that I have received and reviewed this safety briefing.
            </p>

            {/* Error message */}
            {status === 'error' && errorMessage && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className={[
                'w-full py-4 rounded-2xl text-base font-bold mt-5 transition-all flex items-center justify-center gap-2',
                status === 'submitting'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-yellow-400 text-white active:bg-yellow-500',
              ].join(' ')}
            >
              {status === 'submitting' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Acknowledgement'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
