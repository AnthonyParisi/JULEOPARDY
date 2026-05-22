import { useEffect, useRef, useState } from 'react'
import { useAblyGameState } from '../hooks/useAblyGameState'
import RowVideoOverlay from './RowVideoOverlay'
import WinnerCelebration from './WinnerCelebration'

interface PlayerBuzzerProps {
  sessionId: string
  playerId: string
}

export default function PlayerBuzzer({ sessionId, playerId }: PlayerBuzzerProps) {
  const { gameState, buzzIn } = useAblyGameState(sessionId, false, playerId)
  const [localBuzzed, setLocalBuzzed] = useState(false)
  const currentPlayer = gameState.players.find((p) => p.id === playerId)
  const isExcluded = gameState.excludedPlayerIds.includes(playerId)
  const isCelebrating = gameState.phase === 'celebrating' && gameState.celebration
  const isFinished = gameState.phase === 'finished'

  useEffect(() => {
    setLocalBuzzed(false)
  }, [gameState.currentQuestion?.id])

  useEffect(() => {
    if (isExcluded) setLocalBuzzed(false)
  }, [isExcluded])

  useEffect(() => {
    if (gameState.phase !== 'buzz-ready') setLocalBuzzed(false)
  }, [gameState.phase])

  // Keep the latest values in a ref so the keydown listener doesn't need to
  // be re-attached on every render — that re-attach was firing whenever any
  // other player's score changed.
  const buzzStateRef = useRef({ localBuzzed, phase: gameState.phase, isExcluded })
  buzzStateRef.current = { localBuzzed, phase: gameState.phase, isExcluded }

  const handleBuzz = () => {
    const { localBuzzed: lb, phase, isExcluded: ex } = buzzStateRef.current
    if (!lb && phase === 'buzz-ready' && !ex) {
      setLocalBuzzed(true)
      buzzIn()
    }
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      const { localBuzzed: lb, phase, isExcluded: ex } = buzzStateRef.current
      if (lb || phase !== 'buzz-ready' || ex) return
      e.preventDefault()
      handleBuzz()
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
    // Intentionally empty deps: handler reads from the ref, never stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        <p className="text-2xl font-black text-red-600 jiggle-soft">{currentPlayer.name}</p>
        <p className="text-3xl font-black text-pink-600">${currentPlayer.score}</p>
      </div>

      {/* Question Display - if showing */}
      {gameState.currentQuestion && (
        <div
          className={`bg-gradient-to-br from-red-400 to-pink-500 rounded-lg p-3 mb-2 border-3 border-white shadow-lg ${
            isCelebrating ? 'celebrate-glow' : ''
          }`}
        >
          <p className="text-white text-xs font-black text-center drop-shadow mb-1">
            {gameState.currentQuestion.category}
          </p>
          <p className="text-white text-2xl font-black text-center drop-shadow">
            ${gameState.currentQuestion.value}
          </p>
          <p className="text-white text-sm text-center drop-shadow mt-1">
            {gameState.currentQuestion.question}
          </p>
          {isCelebrating && (
            <div className="mt-2 bg-white/95 rounded p-2">
              <p className="text-yellow-500 text-center text-sm font-black celebrate-pop">
                🎉 CORRECT! 🎉
              </p>
              <p className="text-red-600 text-center text-base font-black mt-1">
                {gameState.currentQuestion.answer}
              </p>
            </div>
          )}
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
                : 'bg-gradient-to-br from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white cursor-pointer hover:scale-110 jiggle-hover'
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
        {gameState.buzzerOrder.length > 0 && gameState.phase === 'answered' && gameState.buzzerOrder[0] !== playerId && (
          <p className="text-purple-600 font-bold">
            {gameState.players.find((p) => p.id === gameState.buzzerOrder[0])?.name} is answering
          </p>
        )}
        {gameState.phase !== 'buzz-ready' && !gameState.currentQuestion && (
          <p className="text-gray-600 font-bold">Waiting for question...</p>
        )}
      </div>

      {/* Row video — players see the overlay but not the video itself */}
      {gameState.rowVideo && (
        <RowVideoOverlay rowVideo={gameState.rowVideo} playVideo={false} />
      )}

      {/* End-of-game winner celebration (players see it too, no back button) */}
      {isFinished && <WinnerCelebration players={gameState.players} />}
    </div>
  )
}
