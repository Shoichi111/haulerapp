// AudioPlayer — TTS audio playback for the safety briefing.
// Mounts after the "Start Briefing" tap (user gesture), enabling autoplay on iOS/Android.
// Shows graceful fallback when no audio URL is available yet.

import { useRef, useState } from 'react'

export default function AudioPlayer({ audioUrl }) {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(false)

  // No audio URL — show fallback message
  if (!audioUrl) {
    return (
      <div className="mb-6 border-l-4 border-gray-300 bg-gray-50 px-4 py-3 rounded-r-xl">
        <p className="text-xs text-gray-500">
          Audio unavailable — please read the briefing below.
        </p>
      </div>
    )
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }

  function handleTimeUpdate() {
    setCurrentTime(audioRef.current?.currentTime ?? 0)
  }

  function handleLoadedMetadata() {
    setDuration(audioRef.current?.duration ?? 0)
  }

  function handleScrub(e) {
    const audio = audioRef.current
    if (!audio || duration === 0) return
    const newTime = (Number(e.target.value) / 100) * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  function formatTime(s) {
    if (!isFinite(s) || s < 0) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="mb-6 bg-white border border-gray-200 rounded-2xl px-5 py-4">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        autoPlay
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={() => setError(true)}
      />

      {error ? (
        <p className="text-xs text-red-500">Audio failed to load. Please read the briefing below.</p>
      ) : (
        <div className="flex items-center gap-4">
          {/* Play / Pause button */}
          <button
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-yellow-400 flex items-center justify-center shrink-0"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              // Pause icon
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              // Play icon
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Progress area */}
          <div className="flex-1 min-w-0">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleScrub}
              className="w-full h-1.5 rounded-full accent-yellow-400 cursor-pointer"
              aria-label="Audio progress"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">{formatTime(currentTime)}</span>
              <span className="text-xs text-gray-400">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
