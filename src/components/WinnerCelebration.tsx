import { useMemo } from 'react'
import { Player } from '../types'

interface WinnerCelebrationProps {
  players: Player[]
  // When set, GM sees a "Back to Lobby" button. Players don't get one.
  onBackToLobby?: () => void
}

// Wedding-themed end-of-game screen. Picks the player with the highest score
// and showers them with white/gold/blush confetti, hearts, and a ring.
export default function WinnerCelebration({ players, onBackToLobby }: WinnerCelebrationProps) {
  // Stable confetti so it doesn't re-randomize on every re-render and twitch.
  const confetti = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 4,
        duration: 4 + Math.random() * 4,
        color: ['#ffffff', '#fce7f3', '#facc15', '#fbcfe8', '#f5d0fe'][i % 5],
        rotate: Math.random() * 360,
        symbol: ['💖', '🤍', '💍', '✨', '🌸', '🕊️'][i % 6],
        size: 14 + Math.random() * 14,
      })),
    []
  )

  if (players.length === 0) return null
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const winner = sorted[0]
  const runnersUp = sorted.slice(1)

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-gradient-to-b from-pink-100 via-white to-rose-100">
      {/* Confetti / petals */}
      <div className="pointer-events-none absolute inset-0">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${c.left}%`,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              color: c.color,
              fontSize: `${c.size}px`,
              transform: `rotate(${c.rotate}deg)`,
              width: 'auto',
              height: 'auto',
            }}
          >
            {c.symbol}
          </span>
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-2xl md:text-3xl font-black text-pink-500 mb-2 float-soft">
          💒 The winner of the night 💒
        </p>
        <h1 className="text-6xl md:text-8xl font-black text-rose-600 drop-shadow-xl wedding-bounce mb-4">
          {winner.name}
        </h1>
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="text-5xl heart-pulse">💍</span>
          <p className="text-4xl md:text-5xl font-black text-pink-600 drop-shadow">
            ${winner.score}
          </p>
          <span className="text-5xl heart-pulse">💖</span>
        </div>

        <p className="text-lg md:text-xl font-bold text-rose-500 mb-6 italic">
          Mawwiage... is what bwings us togethew today.
        </p>

        {runnersUp.length > 0 && (
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl px-6 py-4 border-4 border-pink-200 max-w-md w-full">
            <p className="font-black text-rose-600 mb-2">Bridal Party</p>
            <ul className="space-y-1">
              {runnersUp.map((p, idx) => (
                <li
                  key={p.id}
                  className="flex justify-between items-center text-rose-700 font-bold"
                >
                  <span>
                    {idx === 0 ? '🥈' : idx === 1 ? '🥉' : '🌷'} {p.name}
                  </span>
                  <span>${p.score}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {onBackToLobby && (
          <button
            onClick={onBackToLobby}
            className="mt-8 bg-rose-500 hover:bg-rose-600 text-white font-black py-3 px-6 rounded-xl shadow-lg jiggle-hover"
          >
            🎀 Back to Lobby
          </button>
        )}
      </div>
    </div>
  )
}
