import { useEffect, useRef, useState, useCallback } from 'react'
import { useGameState } from '../hooks/useGameState'
import QuestionDisplay from './QuestionDisplay'
import RowVideoOverlay from './RowVideoOverlay'
import ScoreboardSidebar from './ScoreboardSidebar'
import WinnerCelebration from './WinnerCelebration'
import { loadQuestionsFromPublic, fallbackCategoriesFromBundle } from '../data/loadQuestions'

interface GameMasterProps {
  sessionId: string
  playerId: string
  onBackToLobby: () => void
}

export default function GameMaster({ sessionId, playerId, onBackToLobby }: GameMasterProps) {
  const {
    gameState,
    initializeGame,
    selectQuestion,
    markAnswered,
    revealAndCloseQuestion,
    continueAfterCelebration,
    continueAfterRowVideo,
  } = useGameState(sessionId, true, playerId)
  const [initialized, setInitialized] = useState(false)

  // Track who just got marked wrong so the scoreboard sidebar can flash red.
  const prevExcludedCountRef = useRef(0)
  const [wrongPulse, setWrongPulse] = useState<{ playerId: string | null; key: number }>({
    playerId: null,
    key: 0,
  })
  useEffect(() => {
    const len = gameState.excludedPlayerIds.length
    if (len > prevExcludedCountRef.current) {
      const latest = gameState.excludedPlayerIds[len - 1]
      setWrongPulse((prev) => ({ playerId: latest, key: prev.key + 1 }))
    }
    if (len === 0) {
      // Reset when a new question starts so the next exclusion fires again.
      prevExcludedCountRef.current = 0
      return
    }
    prevExcludedCountRef.current = len
  }, [gameState.excludedPlayerIds])

  // Fallback init: only fires if we landed in GameMaster without categories
  // already in state (e.g. URL-deep-linked into an existing session whose
  // localStorage has been wiped). Lobby is the normal seed path.
  useEffect(() => {
    if (initialized) return
    if (gameState.categories.length > 0) {
      setInitialized(true)
      return
    }
    let cancelled = false
    loadQuestionsFromPublic().then((cats) => {
      if (cancelled) return
      initializeGame(cats)
      setInitialized(true)
    })
    return () => {
      cancelled = true
    }
  }, [initialized, gameState.categories.length, initializeGame])

  // Render-time fallback — used for the brief tick before the loader resolves
  // on a fresh GameMaster mount, or for tests that don't go through Lobby.
  const categories = gameState.categories.length > 0
    ? gameState.categories
    : fallbackCategoriesFromBundle()

  const handleQuestionClick = useCallback((catIdx: number, qIdx: number) => {
    selectQuestion(catIdx, qIdx)
  }, [selectQuestion])

  // playerId is provided by solo-mode QuestionDisplay (GM picks who to credit).
  // Multi-device callers omit it; we fall back to the buzzerOrder winner.
  const handleMarkCorrect = useCallback((playerId?: string) => {
    if (!gameState.currentQuestion) return
    const target = playerId ?? gameState.buzzerOrder[0]
    if (!target) return
    markAnswered(target, true)
  }, [gameState.currentQuestion, gameState.buzzerOrder, markAnswered])

  const handleMarkWrong = useCallback((playerId?: string) => {
    if (!gameState.currentQuestion) return
    const target = playerId ?? gameState.buzzerOrder[0]
    if (!target) return
    markAnswered(target, false)
  }, [gameState.currentQuestion, gameState.buzzerOrder, markAnswered])

  const handleRevealAndClose = useCallback(() => {
    revealAndCloseQuestion()
  }, [revealAndCloseQuestion])

  // Determine if all eligible players have tried and failed
  const allPlayersExcluded = gameState.currentQuestion !== null
    && gameState.players.length > 0
    && gameState.players.every((p) => gameState.excludedPlayerIds.includes(p.id))

  const buzzerPlayerId = gameState.buzzerOrder[0]
  const isFinished = gameState.phase === 'finished'

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-200 via-white to-red-100 p-3 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl md:text-2xl font-black text-red-600 drop-shadow-lg jiggle-soft">
          🎉 JULEOPARDY
        </h1>
        <button
          onClick={onBackToLobby}
          className="bg-white hover:bg-gray-100 text-pink-600 font-bold px-2 py-1 rounded text-xs border border-pink-400 transition jiggle-hover"
        >
          ← Lobby
        </button>
      </div>

      {/* Board (left, flex-1) + Scoreboard sidebar (right, fixed narrow) */}
      <div className="flex-1 grid grid-cols-[1fr_160px] md:grid-cols-[1fr_200px] gap-2 min-h-0 overflow-hidden">
        <div className="flex flex-col min-h-0">
          <div className="bg-white rounded-lg shadow-lg p-2 border-3 border-red-300 flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-1 auto-rows-max">
              {categories.map((category, catIdx) => (
                <div key={category.name} className="flex flex-col gap-1">
                  <div className="bg-gradient-to-br from-red-400 to-pink-500 rounded p-1 shadow float-soft">
                    <h3 className="font-black text-white text-xs text-center drop-shadow">
                      {category.name}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-1">
                    {category.questions.map((question, qIdx) => (
                      <button
                        key={question.id}
                        onClick={() => handleQuestionClick(catIdx, qIdx)}
                        disabled={question.status !== 'unanswered'}
                        className={`px-1 py-2 rounded font-black text-xs transition transform ${
                          question.status === 'correct'
                            ? 'bg-green-500 text-green-200 cursor-default'
                            : question.status === 'incorrect'
                              ? 'bg-red-500 text-red-200 cursor-default'
                              : 'bg-white hover:bg-yellow-100 text-red-600 hover:scale-110 cursor-pointer shadow jiggle-hover'
                        }`}
                      >
                        {question.status === 'correct' ? '✓' : question.status === 'incorrect' ? '✗' : `$${question.value}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ScoreboardSidebar
          players={gameState.players}
          excludedPlayerIds={gameState.excludedPlayerIds}
          highlightPlayerId={gameState.celebration?.playerId ?? null}
          wrongPlayerId={wrongPulse.playerId}
          wrongPulseKey={wrongPulse.key}
        />
      </div>

      {/* Question Display Modal */}
      {gameState.currentQuestion && (
        <QuestionDisplay
          question={gameState.currentQuestion}
          onClose={handleRevealAndClose}
          players={gameState.players}
          buzzerPlayer={buzzerPlayerId}
          buzzerPlayerName={buzzerPlayerId ? gameState.players.find((p) => p.id === buzzerPlayerId)?.name : undefined}
          onMarkCorrect={handleMarkCorrect}
          onMarkWrong={handleMarkWrong}
          excludedPlayerIds={gameState.excludedPlayerIds}
          allPlayersExcluded={allPlayersExcluded}
          onRevealAndClose={handleRevealAndClose}
          celebration={gameState.celebration}
          onContinueAfterCelebration={continueAfterCelebration}
        />
      )}

      {/* Row-completion video overlay (between questions) */}
      {gameState.rowVideo && (
        <RowVideoOverlay rowVideo={gameState.rowVideo} onContinue={continueAfterRowVideo} />
      )}

      {/* End-of-game winner celebration */}
      {isFinished && (
        <WinnerCelebration players={gameState.players} onBackToLobby={onBackToLobby} />
      )}
    </div>
  )
}
