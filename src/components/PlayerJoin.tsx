import { useState, useEffect } from 'react'
import { useAblyGameState } from '../hooks/useAblyGameState'

interface PlayerJoinProps {
  sessionId: string
  playerId: string
  onGameStart: () => void
}

export default function PlayerJoin({ sessionId, playerId, onGameStart }: PlayerJoinProps) {
  const { gameState, addPlayer } = useAblyGameState(sessionId, false, playerId)
  const [playerName, setPlayerName] = useState('')
  const [joined, setJoined] = useState(false)

  // Auto-advance to the buzzer view once we're joined and the GM has started the
  // game. This also covers a refreshed player whose playerId is already in the
  // game state — we treat them as already joined (see effect below).
  useEffect(() => {
    if (joined && gameState.phase !== 'setup') {
      onGameStart()
    }
  }, [gameState.phase, joined, onGameStart])

  // If this player is already in the synced player list (e.g. after refresh
  // mid-game), skip the name entry screen entirely.
  useEffect(() => {
    if (!joined && gameState.players.some((p) => p.id === playerId) && gameState.phase !== 'setup') {
      setJoined(true)
    }
  }, [joined, gameState.players, gameState.phase, playerId])

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (playerName.trim()) {
      addPlayer(playerName)
      setJoined(true)
    }
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-300 via-white to-red-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border-4 border-pink-400">
          <h1 className="text-3xl font-black text-red-600 text-center drop-shadow mb-3">🎉</h1>
          <p className="text-xl font-black text-red-600 text-center mb-4">Join the Party!</p>

          <div className="bg-gradient-to-r from-pink-100 to-red-100 rounded-xl p-3 mb-4 text-center border-3 border-pink-300">
            <p className="text-xs font-bold text-pink-600 mb-1">Session Code</p>
            <p className="text-2xl font-black text-red-600 font-mono">{sessionId}</p>
          </div>

          <form onSubmit={handleJoin}>
            <div className="mb-4">
              <label className="block text-red-600 font-black mb-2 text-sm">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                className="w-full px-3 py-2 border-3 border-pink-300 rounded-lg focus:outline-none focus:border-red-500 font-bold text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={!playerName.trim()}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-black py-3 rounded-lg transition text-lg shadow-lg border-3 border-white"
            >
              ✨ Join ✨
            </button>
          </form>

          <p className="text-center text-gray-600 text-xs mt-3">
            You'll join the lobby
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-300 via-white to-red-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border-4 border-pink-400 text-center">
        <div className="text-4xl animate-bounce mb-3">💕</div>
        <h2 className="text-2xl font-black text-red-600 mb-1">You're In!</h2>
        <p className="text-lg font-bold text-pink-600 mb-4">{playerName}</p>

        <div className="bg-gradient-to-r from-pink-100 to-red-100 rounded-lg p-4 border-3 border-pink-300">
          <p className="text-gray-600 font-semibold mb-2 text-sm">Waiting for game to start...</p>
          <div className="flex justify-center gap-1 mt-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-4">
          Session: <span className="font-black text-red-600">{sessionId}</span>
        </p>
      </div>
    </div>
  )
}
