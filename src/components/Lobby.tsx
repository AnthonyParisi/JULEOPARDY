import { useEffect, useState } from 'react'
import { nanoid } from 'nanoid'
import { useGameState } from '../hooks/useGameState'
import { loadQuestionsFromPublic } from '../data/loadQuestions'

interface LobbyProps {
  sessionId: string
  playerId: string
  onGameStart: () => void
}

export default function Lobby({ sessionId, playerId, onGameStart }: LobbyProps) {
  const { gameState, initializeGame, startGame, acceptJoin } = useGameState(sessionId, true, playerId)
  const [initialized, setInitialized] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [submittedPlayers, setSubmittedPlayers] = useState<{ id: string; name: string }[]>([])

  // Always reload questions from public/questions.json while we're in setup.
  // Lobby is the only place a fresh game starts, and the GM hasn't picked any
  // questions yet — so overwriting cached `categories` here makes JSON edits
  // take effect on every lobby visit. Once `phase` moves past 'setup', the
  // existing categories (with progress) are preserved.
  useEffect(() => {
    if (initialized) return
    if (gameState.phase !== 'setup') {
      setInitialized(true)
      return
    }
    let cancelled = false
    loadQuestionsFromPublic().then((categories) => {
      if (cancelled) return
      initializeGame(categories)
      setInitialized(true)
    })
    return () => {
      cancelled = true
    }
  }, [initialized, gameState.phase, initializeGame])

  // If the game is already past setup (refreshed GM landing on the lobby),
  // jump straight to the game master view.
  useEffect(() => {
    if (gameState.phase !== 'setup' && gameState.phase !== 'finished') {
      onGameStart()
    }
  }, [gameState.phase, onGameStart])

  const handleAddSoloPlayer = () => {
    const trimmed = playerName.trim()
    if (!trimmed) return
    setSubmittedPlayers((prev) => [...prev, { id: nanoid(), name: trimmed }])
    setPlayerName('')
  }

  const handleRemoveSoloPlayer = (id: string) => {
    setSubmittedPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  const handleSoloStart = () => {
    for (const p of submittedPlayers) {
      acceptJoin(p.id, p.name)
    }
    startGame()
  }

  const canStart = submittedPlayers.length >= 1
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-300 via-white to-red-200 p-4 flex items-start justify-center">
      <div className="max-w-md w-full mt-8">
        <h1 className="text-2xl md:text-3xl font-black text-red-600 drop-shadow-lg text-center mb-6">
          🎉 JULEOPARDY 🎉
        </h1>

        <div className="bg-white rounded-2xl shadow-xl p-5 border-4 border-pink-400">
          <h2 className="text-lg font-black text-red-600 mb-3">Players</h2>

          {submittedPlayers.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-2">No players yet — add some below.</p>
          ) : (
            <ul className="space-y-2 mb-3">
              {submittedPlayers.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between bg-gradient-to-r from-pink-100 to-red-100 rounded-lg p-2 border-2 border-pink-300"
                >
                  <span className="font-bold text-red-600">{p.name}</span>
                  <button
                    onClick={() => handleRemoveSoloPlayer(p.id)}
                    className="text-pink-500 hover:text-red-600 font-black px-2"
                    aria-label={`Remove ${p.name}`}
                  >
                    ✖
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Add player name"
              onKeyPress={(e) => e.key === 'Enter' && handleAddSoloPlayer()}
              className="flex-1 px-3 py-2 border-2 border-pink-300 rounded focus:outline-none focus:border-red-500 font-semibold"
              autoFocus
            />
            <button
              onClick={handleAddSoloPlayer}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            >
              Add
            </button>
          </div>

          <button
            onClick={handleSoloStart}
            disabled={!canStart}
            className={`w-full text-lg font-black py-3 rounded-lg transition transform hover:scale-105 shadow-lg border-3 ${
              canStart
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-600 cursor-pointer'
                : 'bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed'
            }`}
          >
            {canStart ? '✨ START GAME ✨' : 'Add a player...'}
          </button>
        </div>
      </div>
    </div>
  )
}
