import { useEffect, useRef, useState } from 'react'
import { Player } from '../types'

interface ScoreboardSidebarProps {
  players: Player[]
  excludedPlayerIds?: string[]
  // Optional highlight: the player whose answer just landed (correct).
  highlightPlayerId?: string | null
  // Optional pulse when a player just got marked wrong.
  wrongPlayerId?: string | null
  wrongPulseKey?: number
}

// Narrow vertical scoreboard for the right side of the screen.
// Sorted highest score first; animates rank changes with a bounce; flashes
// red briefly on wrong answers via a key-based pulse.
export default function ScoreboardSidebar({
  players,
  excludedPlayerIds = [],
  highlightPlayerId = null,
  wrongPlayerId = null,
  wrongPulseKey = 0,
}: ScoreboardSidebarProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  // Per-player pulse key whenever their score changes — fires a CSS pop on
  // the score number.
  const prevScoresRef = useRef<Record<string, number>>({})
  const [pulseKey, setPulseKey] = useState<Record<string, number>>({})
  useEffect(() => {
    const updates: Record<string, number> = { ...pulseKey }
    let changed = false
    for (const p of players) {
      if (prevScoresRef.current[p.id] !== p.score) {
        if (prevScoresRef.current[p.id] !== undefined) {
          updates[p.id] = (updates[p.id] || 0) + 1
          changed = true
        }
        prevScoresRef.current[p.id] = p.score
      }
    }
    if (changed) setPulseKey(updates)
    // We intentionally only watch players' scores via the loop above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players])

  return (
    <aside className="bg-white rounded-lg shadow-lg p-2 border-3 border-pink-300 flex flex-col gap-1 h-full overflow-y-auto">
      <h2 className="text-xs font-black text-red-600 mb-1 text-center sticky top-0 bg-white pb-1 z-10">
        💕 Scores
      </h2>
      <ul className="flex flex-col gap-1">
        {sorted.map((player, idx) => {
          const isExcluded = excludedPlayerIds.includes(player.id)
          const isHighlight = highlightPlayerId === player.id
          const isWrong = wrongPlayerId === player.id
          return (
            <li
              key={`${player.id}-${isWrong ? wrongPulseKey : 'ok'}`}
              className={`rounded p-1.5 border-2 text-center text-xs transition-all duration-300 transform ${
                isHighlight
                  ? 'bg-gradient-to-br from-yellow-200 to-pink-200 border-yellow-400 scale-105 celebrate-glow'
                  : idx === 0
                    ? 'bg-gradient-to-br from-yellow-100 to-pink-100 border-yellow-300'
                    : 'bg-gradient-to-br from-pink-100 to-red-100 border-pink-300'
              } ${isExcluded ? 'opacity-60' : ''} ${
                isWrong && wrongPulseKey > 0 ? 'angry-shake' : ''
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="text-[10px] font-black text-rose-500">
                  {idx === 0 ? '👑' : `#${idx + 1}`}
                </span>
                <p className="font-bold text-red-600 truncate text-xs flex-1">
                  {player.name}
                </p>
              </div>
              <p
                key={pulseKey[player.id] || 0}
                className={`text-base font-black ${
                  player.score < 0 ? 'text-red-700' : 'text-pink-600'
                } score-pop`}
              >
                ${player.score}
              </p>
            </li>
          )
        })}
        {sorted.length === 0 && (
          <li className="text-gray-400 text-[10px] text-center py-2">
            No players yet
          </li>
        )}
      </ul>
    </aside>
  )
}
