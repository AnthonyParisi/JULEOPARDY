import { memo, useEffect, useState } from 'react'
import { RowVideo } from '../types'

interface RowVideoOverlayProps {
  rowVideo: RowVideo
  // GM-only. When absent (player view), no Continue button is rendered.
  onContinue?: () => void
  // When false, render the overlay UI but skip actually playing the video
  // (e.g. on player phones — saves bandwidth). Defaults to true.
  playVideo?: boolean
}

// How long the celebration popup is shown before the video kicks in.
const INTRO_DURATION_MS = 2800

// Full-screen overlay shown when an entire point-value row is completed.
// Sequence: (optional) celebration popup → video → Continue button.
// `playing-video` is set on <body> ONLY during the video stage so the intro
// popup can still animate freely.
function RowVideoOverlayInner({ rowVideo, onContinue, playVideo = true }: RowVideoOverlayProps) {
  const hasIntro = rowVideo.message.trim().length > 0
  const [stage, setStage] = useState<'intro' | 'video' | 'ended'>(
    hasIntro ? 'intro' : 'video'
  )

  // Reset when a new rowVideo starts.
  useEffect(() => {
    setStage(hasIntro ? 'intro' : 'video')
  }, [rowVideo.startedAt, rowVideo.videoSrc, hasIntro])

  // Intro auto-advances after a short celebration window.
  useEffect(() => {
    if (stage !== 'intro') return
    const t = window.setTimeout(() => setStage('video'), INTRO_DURATION_MS)
    return () => window.clearTimeout(t)
  }, [stage, rowVideo.startedAt])

  // Silence all animations/transitions on the page only during actual video
  // playback. The intro popup is allowed to animate.
  useEffect(() => {
    if (stage !== 'video') return
    document.body.classList.add('playing-video')
    return () => {
      document.body.classList.remove('playing-video')
    }
  }, [stage])

  // ----- Intro popup -----
  if (stage === 'intro') {
    return (
      <div className="fixed inset-0 z-[55] flex items-center justify-center bg-gradient-to-br from-pink-300 via-rose-200 to-yellow-100 p-6">
        <div className="text-center max-w-3xl">
          <p className="text-pink-600 font-black text-2xl md:text-3xl mb-4 jiggle-soft">
            🎉 ${rowVideo.value} row complete! 🎉
          </p>
          <p className="text-red-600 font-black text-4xl md:text-6xl drop-shadow celebrate-pop leading-tight">
            {rowVideo.message}
          </p>
        </div>
      </div>
    )
  }

  // ----- Video stage (or skipped-intro fallback) -----
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black playing-video">
      <div className="absolute top-3 left-3 text-white/80 text-xs font-mono pointer-events-none">
        ${rowVideo.value} row complete
      </div>

      {playVideo ? (
        <video
          src={rowVideo.videoSrc}
          autoPlay
          playsInline
          preload="auto"
          onEnded={() => setStage('ended')}
          onError={() => setStage('ended')}
          className="max-h-screen max-w-full"
          style={{ transform: 'translateZ(0)' }}
        />
      ) : (
        <div className="text-center text-white">
          <p className="text-2xl font-black">🎬 Row video is playing on the main screen…</p>
          <p className="text-sm mt-2 opacity-80">${rowVideo.value} row complete</p>
        </div>
      )}

      {onContinue && (
        <button
          onClick={onContinue}
          className={`absolute bottom-6 right-6 font-black py-3 px-6 rounded-lg shadow-lg transition ${
            stage === 'ended'
              ? 'bg-yellow-400 hover:bg-yellow-300 text-red-800'
              : 'bg-white/15 hover:bg-white/30 text-white'
          }`}
        >
          {stage === 'ended' ? '▶ Continue' : 'Skip / Continue'}
        </button>
      )}
    </div>
  )
}

// React.memo so parent re-renders (e.g. heartbeat-ish state changes, score
// updates) don't tear down or rerender this component while the <video> tag
// is doing decode work.
const RowVideoOverlay = memo(RowVideoOverlayInner, (prev, next) => {
  return (
    prev.playVideo === next.playVideo &&
    prev.onContinue === next.onContinue &&
    prev.rowVideo.startedAt === next.rowVideo.startedAt &&
    prev.rowVideo.videoSrc === next.rowVideo.videoSrc &&
    prev.rowVideo.message === next.rowVideo.message
  )
})

export default RowVideoOverlay
