// LanguageSelector — shown before the briefing starts.
// Driver picks English, Punjabi, or Hindi, then taps "Start Briefing".
// The "Start Briefing" tap is required to unlock audio autoplay on mobile.

export default function LanguageSelector({ selectedLanguage, onSelect, onStart }) {
  const languages = [
    {
      code: 'en',
      flag: '🇨🇦',
      label: 'English',
      subtitle: 'Continue in English',
    },
    {
      code: 'pu',
      flag: '🇮🇳',
      label: 'ਪੰਜਾਬੀ',
      subtitle: 'ਪੰਜਾਬੀ ਵਿੱਚ ਜਾਰੀ ਰੱਖੋ',
    },
    {
      code: 'hi',
      flag: '🇮🇳',
      label: 'हिंदी',
      subtitle: 'हिंदी में जारी रखें',
    },
  ]

  return (
    <div className="px-6 py-8">
      <h2 className="text-base font-semibold text-gray-600 uppercase tracking-wide mb-2">
        Select your language
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        Choose the language for your safety briefing.
      </p>

      {/* Language cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {languages.map(lang => {
          const isSelected = selectedLanguage === lang.code
          return (
            <button
              key={lang.code}
              onClick={() => onSelect(lang.code)}
              className={[
                'flex flex-col items-center justify-center rounded-2xl py-8 px-4 border-2 transition-all',
                isSelected
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-200 bg-white',
                lang.code === 'hi' ? 'col-span-2' : '',
              ].join(' ')}
            >
              <span className="text-4xl mb-3">{lang.flag}</span>
              <span className="text-lg font-bold text-gray-900">{lang.label}</span>
              <span className="text-xs text-gray-500 mt-1 text-center leading-snug">
                {lang.subtitle}
              </span>
              {isSelected && (
                <span className="mt-3 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Start Briefing button */}
      <button
        onClick={onStart}
        disabled={!selectedLanguage}
        className={[
          'w-full py-4 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-2',
          selectedLanguage
            ? 'bg-yellow-400 text-white active:bg-yellow-500'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed',
        ].join(' ')}
      >
        Start Briefing
        {selectedLanguage && (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>

      {!selectedLanguage && (
        <p className="text-center text-xs text-gray-400 mt-3">
          Select a language above to continue
        </p>
      )}
    </div>
  )
}
