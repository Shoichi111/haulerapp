// BriefingPage — parent container for the full driver briefing flow.
// Steps 1.2–1.6 all live here, revealed progressively.
// Currently shows: language selector (Step 1.2) + briefing text (Step 1.3) + audio player (Step 1.4) + PDF/photo attachments (Step 1.5) + acknowledgement form (Step 1.6).

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import LanguageSelector from '../../components/driver/LanguageSelector'
import AudioPlayer from '../../components/driver/AudioPlayer'
import PDFDocumentList from '../../components/driver/PDFDocumentList'
import AcknowledgementForm from '../../components/driver/AcknowledgementForm'

// ---------------------------------------------------------------------------
// Module-level constants — defined once, never re-allocated on render
// ---------------------------------------------------------------------------

// Realistic placeholder text shown before real AI briefing is published (Step 3.2)
const PLACEHOLDER_BRIEFINGS = {
  en: `DUFFERIN CONSTRUCTION — SITE SAFETY BRIEFING

WHAT IS HAPPENING TODAY
Paving operations are underway on the eastbound lanes. Asphalt trucks will be entering and exiting the work zone throughout the day. A paving machine and several rollers will be operating in a confined corridor.

KEY HAZARDS ON SITE
• Moving equipment — asphalt trucks, paving machine, and rollers are constantly in motion. Never assume equipment operators can see you.
• High-temperature materials — freshly laid asphalt is approximately 150°C (300°F). Do not walk on or near fresh asphalt.
• Limited sight lines — traffic control is in place but vehicles may still approach the zone at speed.
• Pinch points — maintain a minimum 5-metre clearance from any operating equipment at all times.

WHAT YOU MUST DO
• Check in with the Spotter before reversing or positioning your truck. Wait for hand signals before moving.
• Wear your PPE at all times: hard hat, high-visibility vest, and steel-toed boots.
• Follow all directions from the site Flagger and Spotter.
• Keep your windows rolled up when near the paving machine to avoid fume exposure.

WHAT YOU MUST NOT DO
• Do not exit your truck unless instructed to do so by site personnel.
• Do not reverse without a Spotter present and signalling.
• Do not use your phone while manoeuvring in the work zone.
• Do not leave your truck engine running unattended near the paving machine.

Stay alert, follow directions, and work safely. If you are unsure about anything, stop and ask.`,

  pu: `ਡਫੇਰਿਨ ਕੰਸਟ੍ਰਕਸ਼ਨ — ਸਾਈਟ ਸੁਰੱਖਿਆ ਬ੍ਰੀਫਿੰਗ

ਅੱਜ ਕੀ ਹੋ ਰਿਹਾ ਹੈ
ਪੂਰਬ ਦਿਸ਼ਾ ਦੀਆਂ ਲੇਨਾਂ 'ਤੇ ਪੇਵਿੰਗ ਦਾ ਕੰਮ ਚੱਲ ਰਿਹਾ ਹੈ। ਅਸਫਾਲਟ ਟਰੱਕ ਸਾਰਾ ਦਿਨ ਕੰਮ ਵਾਲੇ ਖੇਤਰ ਵਿੱਚ ਆਉਂਦੇ-ਜਾਂਦੇ ਰਹਿਣਗੇ।

ਸਾਈਟ 'ਤੇ ਮੁੱਖ ਖ਼ਤਰੇ
• ਚੱਲਦੇ ਉਪਕਰਣ — ਟਰੱਕ ਅਤੇ ਮਸ਼ੀਨਰੀ ਹਮੇਸ਼ਾ ਚੱਲ ਰਹੀ ਹੁੰਦੀ ਹੈ। ਕਦੇ ਵੀ ਇਹ ਨਾ ਮੰਨੋ ਕਿ ਆਪਰੇਟਰ ਤੁਹਾਨੂੰ ਦੇਖ ਸਕਦੇ ਹਨ।
• ਗਰਮ ਸਮੱਗਰੀ — ਤਾਜ਼ਾ ਅਸਫਾਲਟ ਲਗਭਗ 150°C ਹੁੰਦੀ ਹੈ। ਇਸ ਦੇ ਨੇੜੇ ਨਾ ਜਾਓ।
• ਤੁਹਾਨੂੰ ਹਰ ਸਮੇਂ ਆਪਣੇ PPE ਪਹਿਨਣੇ ਚਾਹੀਦੇ ਹਨ: ਹਾਰਡ ਹੈਟ, ਹਾਈ-ਵਿਜ਼ੀਬਿਲਿਟੀ ਵੇਸਟ।

ਤੁਹਾਨੂੰ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ
• ਪਿੱਛੇ ਹਟਣ ਤੋਂ ਪਹਿਲਾਂ ਸਪੌਟਰ ਤੋਂ ਮਨਜ਼ੂਰੀ ਲਓ।
• ਸਾਈਟ ਦੇ ਫਲੈਗਰ ਅਤੇ ਸਪੌਟਰ ਦੀਆਂ ਹਦਾਇਤਾਂ ਦੀ ਪਾਲਣਾ ਕਰੋ।

ਤੁਹਾਨੂੰ ਕੀ ਨਹੀਂ ਕਰਨਾ ਚਾਹੀਦਾ
• ਜਦੋਂ ਤੱਕ ਸਾਈਟ ਕਰਮਚਾਰੀ ਨਾ ਕਹੇ, ਟਰੱਕ ਤੋਂ ਬਾਹਰ ਨਾ ਨਿਕਲੋ।
• ਕੰਮ ਵਾਲੇ ਖੇਤਰ ਵਿੱਚ ਫ਼ੋਨ ਦੀ ਵਰਤੋਂ ਨਾ ਕਰੋ।

ਸੁਚੇਤ ਰਹੋ, ਹਦਾਇਤਾਂ ਦੀ ਪਾਲਣਾ ਕਰੋ, ਅਤੇ ਸੁਰੱਖਿਅਤ ਕੰਮ ਕਰੋ।`,

  hi: `डफेरिन कंस्ट्रक्शन — साइट सुरक्षा ब्रीफिंग

आज क्या हो रहा है
पूर्व दिशा की लेनों पर पेविंग का काम चल रहा है। डामर ट्रक पूरे दिन काम क्षेत्र में आते-जाते रहेंगे।

साइट पर मुख्य खतरे
• चलते उपकरण — ट्रक और मशीनें हमेशा चलती रहती हैं। यह कभी न मानें कि ऑपरेटर आपको देख सकते हैं।
• गर्म सामग्री — ताजा डामर लगभग 150°C होता है। इसके पास न जाएं।
• हर समय अपने सुरक्षा उपकरण पहनें: हार्ड हैट, हाई-विजिबिलिटी वेस्ट।

आपको क्या करना चाहिए
• पीछे हटने से पहले स्पॉटर से अनुमति लें।
• साइट के फ्लैगर और स्पॉटर के निर्देशों का पालन करें।

आपको क्या नहीं करना चाहिए
• जब तक साइट कर्मचारी न कहें, ट्रक से बाहर न निकलें।
• काम क्षेत्र में फोन का उपयोग न करें।

सतर्क रहें, निर्देशों का पालन करें, और सुरक्षित काम करें।`,
}

// Firestore field names for each language
const LANG_FIELD = {
  en: 'generatedBriefingEn',
  pu: 'generatedBriefingPu',
  hi: 'generatedBriefingHi',
}

// Firestore field names for TTS audio URLs
const AUDIO_FIELD = {
  en: 'audioUrlEn',
  pu: 'audioUrlPu',
  hi: 'audioUrlHi',
}

// Returns real Firestore text if it exists and is non-empty; falls back to placeholder.
function getBriefingText(br, lang) {
  if (!lang) return PLACEHOLDER_BRIEFINGS.en
  const real = br?.[LANG_FIELD[lang]]
  return (real && real.trim().length > 0) ? real : (PLACEHOLDER_BRIEFINGS[lang] ?? PLACEHOLDER_BRIEFINGS.en)
}

// Returns true when the selected language has no real AI text yet (drives preview notice)
function isPlaceholderText(br, lang) {
  if (!lang) return true
  const real = br?.[LANG_FIELD[lang]]
  return !real || real.trim().length === 0
}

// ---------------------------------------------------------------------------

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

            {/* Steps 1.3–1.6: shown after driver taps Start Briefing */}
            {started && (
              <div className="px-6 py-8">

                {/* Language badge + date */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold uppercase tracking-wide">
                    {{ en: 'English', pu: 'ਪੰਜਾਬੀ', hi: 'हिंदी' }[selectedLanguage]}
                  </span>
                  {briefing.briefingDate && (
                    <span className="text-xs text-gray-400">{briefing.briefingDate}</span>
                  )}
                </div>

                {/* Preview notice — auto-disappears when real AI text exists for selected language (Step 3.2) */}
                {isPlaceholderText(briefing, selectedLanguage) && (
                  <div className="mb-4 border-l-4 border-yellow-400 bg-yellow-50 px-4 py-3 rounded-r-xl">
                    <p className="text-xs text-yellow-700 font-medium">
                      Preview — AI-generated briefing will appear here once published.
                    </p>
                  </div>
                )}

                {/* Step 1.4: Audio player — auto-plays after Start Briefing gesture */}
                <AudioPlayer audioUrl={briefing[AUDIO_FIELD[selectedLanguage]] ?? null} />

                {/* Briefing text card */}
                <div className="bg-white border border-gray-200 rounded-2xl px-6 py-6">
                  <p className="text-base leading-relaxed text-gray-700 whitespace-pre-line">
                    {getBriefingText(briefing, selectedLanguage)}
                  </p>
                  {briefing.createdBy && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-400">
                        Prepared by: <span className="font-medium text-gray-500">{briefing.createdBy}</span>
                        {briefing.ccPhone && <span className="ml-2">· {briefing.ccPhone}</span>}
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 1.5: PDF documents + inline photos */}
                <PDFDocumentList
                  pdfUrls={briefing.pdfUrls ?? null}
                  photoUrls={briefing.photoUrls ?? null}
                />
                {/* Step 1.6: Acknowledgement form */}
                <AcknowledgementForm
                  briefingId={briefing.id}
                  briefingVersion={briefing.version ?? 1}
                  projectId={projectId}
                  selectedLanguage={selectedLanguage}
                />
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
