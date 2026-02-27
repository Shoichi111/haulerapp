// BriefingPage — parent container for the full driver briefing flow.
// Steps 1.2–1.6 all live here, revealed progressively.
// Currently shows: language selector (Step 1.2).
// Steps 1.3–1.6 will be added in subsequent build steps.

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import LanguageSelector from '../../components/driver/LanguageSelector'

export default function BriefingPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const [briefing, setBriefing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedLanguage, setSelectedLanguage] = useState(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    async function fetchBriefing() {
      try {
        const q = query(
          collection(db, 'briefings'),
          where('projectId', '==', projectId),
          where('isActive', '==', true),
          where('status', '==', 'published')
        )
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          setBriefing({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() })
        }
        // No briefing found is not an error — just means none published yet
      } catch (err) {
        console.error('Failed to load briefing:', err)
        setError('Unable to load the briefing. Please check your connection and try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchBriefing()
  }, [projectId])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            {/* Back arrow */}
            <button
              onClick={() => navigate('/')}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mr-1"
              aria-label="Back to job sites"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Dufferin Construction</h1>
              <p className="text-sm text-gray-500">Driver Safety Briefing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="px-6 py-8">
            <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 text-red-700 text-sm">
              {error}
            </div>
          </div>
        )}

        {/* No published briefing yet */}
        {!loading && !error && !briefing && (
          <div className="px-6 py-8">
            <div className="bg-white border border-gray-200 rounded-2xl px-6 py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
              </div>
              <p className="text-gray-700 font-semibold">No briefing available yet</p>
              <p className="text-gray-400 text-sm mt-1">Today's briefing hasn't been published. Please check with your coordinator.</p>
            </div>
          </div>
        )}

        {/* Briefing found — show flow */}
        {!loading && !error && briefing && (
          <>
            {/* Step 1.2: Language selector */}
            {!started && (
              <LanguageSelector
                selectedLanguage={selectedLanguage}
                onSelect={setSelectedLanguage}
                onStart={() => setStarted(true)}
              />
            )}

            {/* Steps 1.3–1.6 added here in subsequent steps */}
            {started && (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">
                <p>✅ Language selected: <strong>{selectedLanguage === 'en' ? 'English' : 'ਪੰਜਾਬੀ'}</strong></p>
                <p className="mt-2 text-gray-400">Briefing content coming in Step 1.3.</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
