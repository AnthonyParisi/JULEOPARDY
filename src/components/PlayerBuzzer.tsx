import { useEffect, useState } from 'react'
import { useAblyGameState } from '../hooks/useAblyGameState'
import QuestionDisplay from './QuestionDisplay'

interface PlayerBuzzerProps {
  sessionId: string
  playerId: string
}

export default function PlayerBuzzer({ sessionId, playerId }: PlayerBuzzerProps) {
  const { gameState, buzzIn } = useAblyGameState(sessionId, false, playerId)
  const [localBuzzed, setLocalBuzzed] = useState(false)
  const currentPlayer = gameState.players.find((p) => p.id === playerId)
  const isExcluded = gameState.excludedPlayerIds.includes(playerId)

  // Reset local buzzed state when a new question is selected or exclusion list changes
  useEffect(() => {
    setLocalBuzzed(false)
  }, [gameState.currentQuestion?.id])

  // Also reset when excluded (wrong answer resets buzzer state)
  useEffect(() => {
    if (isExcluded) {
      setLocalBuzzed(false)
    }
  }, [isExcluded])

  // Handle spacebar buzz
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !localBuzzed && gameState.phase === 'buzz-ready' && !isExcluded) {
        e.preventDefault()
        handleBuzz()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [localBuzzed, gameState.phase, isExcluded])

  const handleBuzz = () => {
    if (!localBuzzed && gameState.phase === 'buzz-ready' && !isExcluded) {
      setLocalBuzzed(true)
      buzzIn()
    }
  }

  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-300 via-white to-red-200 flex items-center justify-center p-4">
        <p className="text-lg font-black text-red-600">Joining...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-200 via-white to-red-100 p-3 flex flex-col">
      {/* Header - Player Name & Score */}
      <div className="text-center mb-2">
        <p className="text-2xl font-black text-red-600">{currentPlayer.name}</p>
        <p className="text-3xl font-black text-pink-600">${currentPlayer.score}</p>
      </div>

      {/* Scoreboard - Compact */}
      <div className="bg-white rounded-lg shadow-lg p-2 border-3 border-pink-300 mb-2">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-1">
          {gameState.players.map((player) => (
            <div
              key={player.id}
              className={`p-2 rounded text-center text-xs font-bold transition ${
                player.id === playerId
                  ? 'bg-gradient-to-br from-red-400 to-pink-400 text-white border-2 border-white shadow'
                  : 'bg-gradient-to-br from-pink-100 to-red-100 text-red-600 border border-pink-300'
              }`}
            >
              <p className="truncate">{player.name}</p>
              <p className="text-lg font-black">${player.score}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Question Display - if showing */}
      {gameState.currentQuestion && (
        <div className="bg-gradient-to-br from-red-400 to-pink-500 rounded-lg p-3 mb-2 border-3 border-white shadow-lg">
          <p className="text-white text-xs font-black text-center drop-shadow mb-1">
            {gameState.currentQuestion.category}
          </p>
          <p className="text-white text-2xl font-black text-center drop-shadow">
            ${gameState.currentQuestion.value}
          </p>
          <p className="text-white text-sm text-center drop-shadow mt-1">
            {gameState.currentQuestion.question}
          </p>
        </div>
      )}

      {/* Main Buzz Button - Large */}
      <div className="flex-1 flex flex-col justify-center mb-2">
        <button
          onClick={handleBuzz}
          disabled={
            gameState.phase !== 'buzz-ready' ||
            localBuzzed ||
            currentPlayer.buzzedIn
          }
          className={`w-full py-16 rounded-2xl font-black text-3xl transition transform active:scale-95 border-4 border-white shadow-2xl ${
            gameState.phase !== 'buzz-ready'
              ? 'bg-gray-400 text-gray-600 cursor-default'
              : localBuzzed || currentPlayer.buzzedIn
                ? 'bg-red-600 text-white cursor-default'
                : 'bg-gradient-to-br from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white cursor-pointer hover:scale-110'
          }`}
        >
          {gameState.phase === 'buzz-ready'
            ? localBuzzed
              ? '✓ BUZZED!'
              : '🔔 BUZZ'
            : gameState.currentQuestion
              ? '⏳'
              : '⏰'}
        </button>
        <p className="text-center text-red-600 font-bold mt-1 text-xs">
          Press SPACEBAR or tap
        </p>
      </div>

      {/* Status */}
      <div className="bg-white rounded-lg shadow-lg p-2 border-3 border-pink-300 text-center text-xs">
        {isExcluded && (
          <p className="text-red-600 font-black">✗ You answered wrong — can't buzz again on this question</p>
        )}
        {localBuzzed && (
          <p className="text-green-600 font-black">✓ You buzzed in!</p>
        )}
        {gameState.buzzerOrder.length > 0 && gameState.phase === 'buzz-ready' && !localBuzzed && (
          <p className="text-purple-600 font-bold">
            {gameState.players.find((p) => p.id === gameState.buzzerOrder[0])?.name} is answering
          </p>
        )}
        {gameState.phase !== 'buzz-ready' && !gameState.currentQuestion && (
          <p className="text-gray-600 font-bold">Waiting for question...</p>
        )}
      </div>

      {/* Question Display Modal */}
      {gameState.currentQuestion && (
        <QuestionDisplay
          question={gameState.currentQuestion}
          onClose={() => {}}
        />
      )}
    </div>
  )
}
