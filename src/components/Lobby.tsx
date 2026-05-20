import { useEffect, useState } from 'react'
import QRCode from 'qrcode.react'
import { useAblyGameState } from '../hooks/useAblyGameState'
import { QUESTIONS_DATA } from '../data/questions'
import { Category } from '../types'

interface LobbyProps {
  sessionId: string
  playerId: string
  onGameStart: () => void
}

export default function Lobby({ sessionId, playerId, onGameStart }: LobbyProps) {
  const { gameState, initializeGame, startGame, addPlayer } = useAblyGameState(sessionId, true, playerId)
  const [initialized, setInitialized] = useState(false)
  const [playerName, setPlayerName] = useState('')

  useEffect(() => {
    if (!initialized) {
      const categories: Category[] = QUESTIONS_DATA.map((cat) => ({
        name: cat.category,
        questions: cat.questions.map((q, idx) => ({
          id: `${cat.category}-${idx}`,
          category: cat.category,
          value: q.value,
          question: q.question,
          answer: q.answer,
          status: 'unanswered' as const,
        })),
      }))
      initializeGame(categories)
      setInitialized(true)
    }
  }, [initialized, initializeGame])

  const handleAddGameMaster = () => {
    if (playerName.trim()) {
      addPlayer(playerName)
      setPlayerName('')
    }
  }

  const joinUrl = `${window.location.origin}?session=${sessionId}&master=false`
  const allPlayersReady = gameState.players.length > 0 && gameState.players.every(p => p.name)

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-300 via-white to-red-200 p-3 flex flex-col">
      <div className="flex-1 flex flex-col max-w-full overflow-hidden">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-2xl md:text-3xl font-black text-red-600 drop-shadow-lg">
            🎉 JEOPARDY PARTY! 🎉
          </h1>
        </div>

        {/* Main Content - Two columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0 overflow-hidden">
          {/* Left: QR Code & Master Setup */}
          <div className="flex flex-col gap-2 min-h-0 overflow-y-auto">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white rounded-lg shadow-lg p-3 border-3 border-pink-400 w-fit">
                <QRCode value={joinUrl} size={120} level="H" />
                <p className="text-center text-red-600 font-bold mt-2 text-xs">
                  Scan to Join!
                </p>
                <p className="text-center text-pink-600 font-bold text-sm">
                  {sessionId}
                </p>
              </div>
            </div>

            {/* Game Master Setup */}
            <div className="bg-white rounded-lg shadow-lg p-3 border-3 border-red-400">
              <h2 className="text-sm font-black text-red-600 mb-2">👑 Game Master</h2>
              <div className="flex gap-1 mb-2">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your name"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddGameMaster()}
                  className="flex-1 px-2 py-2 text-sm border-2 border-pink-300 rounded focus:outline-none focus:border-red-500 font-semibold"
                  autoFocus
                />
                <button
                  onClick={handleAddGameMaster}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded text-sm transition"
                >
                  Add
                </button>
              </div>
              {gameState.players.some(p => p.id === playerId) && (
                <p className="text-green-600 font-bold text-xs">✓ You're in!</p>
              )}
            </div>
          </div>

          {/* Right: Players Lobby */}
          <div className="bg-white rounded-lg shadow-lg p-3 border-3 border-pink-400 flex flex-col min-h-0">
            <h2 className="text-sm font-black text-red-600 mb-2">
              👯 Players ({gameState.players.length})
            </h2>

            {gameState.players.length === 0 ? (
              <p className="text-gray-500 text-xs text-center flex-1 flex items-center justify-center">
                Waiting for players...
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1">
                {gameState.players.map((player) => (
                  <div
                    key={player.id}
                    className="bg-gradient-to-br from-pink-100 to-red-100 rounded p-2 border-2 border-pink-300 shadow-sm"
                  >
                    <p className="text-sm font-black text-red-600">{player.name}</p>
                    <p className="text-gray-600 text-xs">Ready!</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Start Button - Bottom */}
        <div className="text-center mt-2 pt-2 border-t-2 border-pink-300">
          <button
            onClick={() => {
              startGame()
              onGameStart()
            }}
            disabled={!allPlayersReady}
            className={`text-lg font-black py-3 px-8 rounded-lg transition transform hover:scale-105 shadow-lg border-3 w-full ${
              allPlayersReady
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-600 cursor-pointer'
                : 'bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed'
            }`}
          >
            {allPlayersReady ? '✨ START GAME ✨' : 'Waiting...'}
          </button>
        </div>
      </div>
    </div>
  )
}
