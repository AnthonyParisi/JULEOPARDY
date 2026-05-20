import { useEffect, useState, useCallback } from 'react'
import { useAblyGameState } from '../hooks/useAblyGameState'
import QuestionDisplay from './QuestionDisplay'
import { QUESTIONS_DATA } from '../data/questions'
import { Category } from '../types'

interface GameMasterProps {
  sessionId: string
  playerId: string
  onBackToLobby: () => void
}

export default function GameMaster({ sessionId, playerId, onBackToLobby }: GameMasterProps) {
  const { gameState, initializeGame, selectQuestion, markAnswered, resetBuzzers, testBuzz, revealAndCloseQuestion } = useAblyGameState(
    sessionId,
    true,
    playerId
  )
  const [initialized, setInitialized] = useState(false)

  // Initialize game on mount
  useEffect(() => {
    if (!initialized && gameState.categories.length === 0) {
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
  }, [initialized, gameState.categories.length, initializeGame])

  // Use stored categories or fallback to default
  const categories = gameState.categories.length > 0 ? gameState.categories : QUESTIONS_DATA.map((cat) => ({
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

  const handleQuestionClick = useCallback((catIdx: number, qIdx: number) => {
    selectQuestion(catIdx, qIdx)
  }, [selectQuestion])

  const handleMarkCorrect = useCallback(() => {
    if (gameState.currentQuestion && gameState.buzzerOrder.length > 0) {
      markAnswered(gameState.buzzerOrder[0], true)
    }
  }, [gameState.currentQuestion, gameState.buzzerOrder, markAnswered])

  const handleMarkWrong = useCallback(() => {
    if (gameState.currentQuestion && gameState.buzzerOrder.length > 0) {
      markAnswered(gameState.buzzerOrder[0], false)
    }
  }, [gameState.currentQuestion, gameState.buzzerOrder, markAnswered])

  const handleRevealAndClose = useCallback(() => {
    revealAndCloseQuestion()
  }, [revealAndCloseQuestion])

  // Determine if all eligible players have tried and failed
  const allPlayersExcluded = gameState.currentQuestion !== null
    && gameState.players.length > 0
    && gameState.players.every((p) => gameState.excludedPlayerIds.includes(p.id))

  const remainingPlayersCount = gameState.currentQuestion
    ? gameState.players.filter((p) => !gameState.excludedPlayerIds.includes(p.id)).length
    : 0

  const buzzerPlayerId = gameState.buzzerOrder[0]

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-200 via-white to-red-100 p-3 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-xl md:text-2xl font-black text-red-600 drop-shadow-lg">🎉 JEOPARDY!</h1>
        <button
          onClick={onBackToLobby}
          className="bg-white hover:bg-gray-100 text-pink-600 font-bold px-2 py-1 rounded text-xs border border-pink-400 transition"
        >
          ← Lobby
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 gap-2 min-h-0 overflow-hidden">
        {/* Game Board - Full Width */}
        <div className="flex flex-col min-h-0">
          <div className="bg-white rounded-lg shadow-lg p-2 border-3 border-red-300 flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-1 auto-rows-max">
              {categories.map((category, catIdx) => (
                <div key={category.name} className="flex flex-col gap-1">
                  <div className="bg-gradient-to-br from-red-400 to-pink-500 rounded p-1 shadow">
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
                              : 'bg-white hover:bg-yellow-100 text-red-600 hover:scale-110 cursor-pointer shadow'
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

        {/* Scoreboard - Below Board */}
        <div className="bg-white rounded-lg shadow-lg p-2 border-3 border-pink-300">
          <h2 className="text-xs font-black text-red-600 mb-1">💕 Scores</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`bg-gradient-to-br from-pink-100 to-red-100 rounded p-1 border-2 border-pink-300 text-center text-xs ${
                  gameState.excludedPlayerIds.includes(player.id) ? 'opacity-50' : ''
                }`}
              >
                <p className="font-bold text-red-600 truncate text-xs">{player.name}</p>
                <p className="text-base font-black text-pink-600">${player.score}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question Display Modal - contains all scoring controls, test buzz, and reveal/close */}
      {gameState.currentQuestion && (
        <QuestionDisplay
          question={gameState.currentQuestion}
          onClose={handleRevealAndClose}
          // scoring props
          buzzerPlayer={buzzerPlayerId}
          buzzerPlayerName={buzzerPlayerId ? gameState.players.find((p) => p.id === buzzerPlayerId)?.name : undefined}
          onMarkCorrect={handleMarkCorrect}
          onMarkWrong={handleMarkWrong}
          // wrong-answer flow props
          excludedPlayerIds={gameState.excludedPlayerIds}
          allPlayersExcluded={allPlayersExcluded}
          onRevealAndClose={handleRevealAndClose}
          // test buzz props
          playerCount={gameState.players.length}
          onTestBuzz={(playerIndex) => {
            if (playerIndex !== undefined) {
              const playerId = gameState.players[playerIndex]?.id
              if (playerId) testBuzz(playerId)
            } else {
              testBuzz()
            }
          }}
        />
      )}
    </div>
  )
}