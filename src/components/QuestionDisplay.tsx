import { useEffect, useRef, useState } from 'react'
import { Celebration, Player, Question } from '../types'

interface QuestionDisplayProps {
  question: Question
  onClose: () => void
  // scoring props - called directly when GM hits Correct/Wrong
  buzzerPlayer?: string | undefined
  buzzerPlayerName?: string | undefined
  onMarkCorrect?: (playerId?: string) => void
  onMarkWrong?: (playerId?: string) => void
  // wrong-answer flow props
  excludedPlayerIds?: string[]
  allPlayersExcluded?: boolean
  onRevealAndClose?: () => void
  // solo mode props
  mode?: 'solo' | 'multi'
  players?: Player[]
  // celebration props
  celebration?: Celebration | null
  onContinueAfterCelebration?: () => void
}

export default function QuestionDisplay({
  question,
  onClose,
  buzzerPlayer,
  buzzerPlayerName,
  onMarkCorrect,
  onMarkWrong,
  excludedPlayerIds = [],
  allPlayersExcluded = false,
  onRevealAndClose,
  mode = 'multi',
  players = [],
  celebration = null,
  onContinueAfterCelebration,
}: QuestionDisplayProps) {
  const [showAnswer, setShowAnswer] = useState(false)
  // angry-flash: re-trigger CSS keyframe whenever an exclusion is added by
  // bumping a key. We compare current length to the previous render's length.
  const prevExcludedRef = useRef<number>(excludedPlayerIds.length)
  const [angryKey, setAngryKey] = useState(0)

  const celebrant = celebration
    ? players.find((p) => p.id === celebration.playerId)
    : null

  useEffect(() => {
    setShowAnswer(false)
    prevExcludedRef.current = 0
  }, [question.id])

  // Trigger angry flash when an exclusion (wrong answer) is newly added.
  useEffect(() => {
    if (excludedPlayerIds.length > prevExcludedRef.current) {
      setAngryKey((k) => k + 1)
    }
    prevExcludedRef.current = excludedPlayerIds.length
  }, [excludedPlayerIds.length])

  const isCelebrating = celebration !== null
  const canBuzzAgain = !allPlayersExcluded && !buzzerPlayer

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" />

      {/* Wrong-answer angry flash overlay (non-blocking) */}
      {angryKey > 0 && (
        <div
          key={angryKey}
          className="pointer-events-none fixed inset-0 z-40 angry-flash"
        />
      )}

      {/* Question Card with Animation */}
      <div
        className={`relative z-10 w-full h-full flex items-center justify-center animate-scaleIn max-h-screen overflow-y-auto ${
          angryKey > 0 ? 'angry-shake-key-' + (angryKey % 2) : ''
        }`}
      >
        <div
          key={angryKey}
          className={`bg-gradient-to-br from-red-500 via-pink-500 to-red-600 rounded-2xl shadow-2xl p-6 w-full max-w-2xl border-6 border-white my-4 ${
            angryKey > 0 ? 'angry-shake' : ''
          } ${isCelebrating ? 'celebrate-glow' : ''}`}
        >
          {/* Category */}
          <div className="text-white text-center mb-4">
            <p className="text-lg font-black opacity-90 mb-2 drop-shadow">CATEGORY</p>
            <h2 className="text-3xl md:text-4xl font-black drop-shadow">{question.category}</h2>
          </div>

          {/* Question Value */}
          <div className="text-white text-center mb-6">
            <p className="text-5xl md:text-6xl font-black drop-shadow jiggle-soft">
              ${question.value}
            </p>
          </div>

          {/* Celebration banner */}
          {isCelebrating && celebrant && (
            <div className="text-center mb-3">
              <p className="text-yellow-200 text-2xl md:text-3xl font-black drop-shadow celebrate-pop">
                🎉 {celebrant.name} got it! +${question.value} 🎉
              </p>
            </div>
          )}

          {/* Question Content */}
          <div className="bg-white rounded-xl p-4 mb-4">
            <p className="text-2xl md:text-3xl font-bold text-center text-red-600 mb-4">
              {question.question}
            </p>

            {(showAnswer || isCelebrating) && (
              <div className="border-t-4 border-red-500 pt-4">
                <p
                  className={`text-2xl md:text-3xl font-black text-center text-red-600 ${
                    isCelebrating ? 'celebrate-pop' : ''
                  }`}
                >
                  {question.answer}
                </p>
              </div>
            )}
          </div>

          {/* Exclusion message */}
          {!isCelebrating && excludedPlayerIds.length > 0 && !showAnswer && (
            <div className="text-center mb-3">
              <p className="text-white/90 text-sm font-bold">
                {excludedPlayerIds.length === 1
                  ? '1 player got it wrong — others can still buzz in!'
                  : `${excludedPlayerIds.length} players got it wrong — others can still buzz in!`}
              </p>
            </div>
          )}

          {!isCelebrating && allPlayersExcluded && !showAnswer && (
            <div className="text-center mb-3">
              <p className="text-yellow-300 text-sm font-black">
                All players have tried — time to reveal the answer!
              </p>
            </div>
          )}

          {/* Solo: per-player ✓/✗ buttons */}
          {!isCelebrating && mode === 'solo' && onMarkCorrect && onMarkWrong && !showAnswer && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              {players.map((player) => {
                const isExcluded = excludedPlayerIds.includes(player.id)
                return (
                  <div
                    key={player.id}
                    className={`bg-white rounded-lg p-2 text-center border-2 ${
                      isExcluded ? 'border-gray-300 opacity-50' : 'border-pink-300'
                    }`}
                  >
                    <p className="font-black text-red-600 text-sm truncate">{player.name}</p>
                    <p className="text-pink-600 font-bold text-xs mb-2">${player.score}</p>
                    {isExcluded ? (
                      <p className="text-gray-500 text-xs font-bold">Excluded</p>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setShowAnswer(true)
                            onMarkCorrect(player.id)
                          }}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-1 rounded text-xs jiggle-hover"
                        >
                          ✓ +${question.value}
                        </button>
                        <button
                          onClick={() => onMarkWrong(player.id)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-1 rounded text-xs jiggle-hover"
                        >
                          ✗ −${question.value}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center items-center flex-wrap">
            {/* During celebration: GM Continue button */}
            {isCelebrating && onContinueAfterCelebration && (
              <button
                onClick={onContinueAfterCelebration}
                className="bg-yellow-400 hover:bg-yellow-300 text-red-800 font-black py-3 px-6 rounded-lg transition jiggle-hover text-base md:text-lg shadow-lg"
              >
                ▶ Continue
              </button>
            )}

            {/* Scoring controls (multi-device) */}
            {!isCelebrating && mode !== 'solo' && buzzerPlayer && onMarkCorrect && onMarkWrong ? (
              <>
                <div className="text-center">
                  <p className="text-xs text-white">Buzzed:</p>
                  <p className="font-black text-white">{buzzerPlayerName || buzzerPlayer}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAnswer(true)
                    onMarkCorrect()
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white font-black py-2 px-4 rounded-lg transition text-sm md:text-base jiggle-hover"
                >
                  ✓ Correct
                </button>
                <button
                  onClick={() => {
                    onMarkWrong()
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-black py-2 px-4 rounded-lg transition text-sm md:text-base jiggle-hover"
                >
                  ✗ Wrong
                </button>
              </>
            ) : !isCelebrating && mode !== 'solo' && canBuzzAgain ? (
              <p className="text-white font-bold text-sm">Waiting for a player to buzz in...</p>
            ) : null}

            {/* Reveal Answer button - show when no buzzers active or all players excluded */}
            {!isCelebrating && (!buzzerPlayer || allPlayersExcluded) && !showAnswer && onRevealAndClose && (
              <button
                onClick={() => setShowAnswer(true)}
                className="bg-yellow-400 hover:bg-yellow-500 text-red-800 font-black py-2 px-4 rounded-lg transition text-sm md:text-base jiggle-hover"
              >
                👀 Reveal Answer
              </button>
            )}

            {/* Show/Hide answer toggle (when no scoring flow active) */}
            {!isCelebrating && !buzzerPlayer && !allPlayersExcluded && !showAnswer && !onRevealAndClose && (
              <button
                onClick={() => setShowAnswer(true)}
                className="bg-white hover:bg-gray-100 text-red-600 font-black py-2 px-4 rounded-lg transition text-sm md:text-base jiggle-hover"
              >
                👀 Show Answer
              </button>
            )}

            {/* Close / Move On button */}
            {!isCelebrating && onRevealAndClose && showAnswer && (
              <button
                onClick={onRevealAndClose}
                className="bg-red-700 hover:bg-red-800 text-white font-black py-2 px-4 rounded-lg transition text-sm md:text-base jiggle-hover"
              >
                ✗ Move On (Mark Incorrect)
              </button>
            )}

            {/* Done button (when no onRevealAndClose is provided - player view) */}
            {!isCelebrating && !onRevealAndClose && (
              <button
                onClick={onClose}
                className="bg-white hover:bg-gray-100 text-pink-600 font-black py-2 px-4 rounded-lg transition text-sm md:text-base jiggle-hover"
              >
                ✓ Done
              </button>
            )}

            {/* Show/Hide toggle when answer is already visible */}
            {!isCelebrating && showAnswer && !onRevealAndClose && (
              <button
                onClick={() => setShowAnswer(false)}
                className="bg-white hover:bg-gray-100 text-red-600 font-black py-2 px-4 rounded-lg transition text-sm md:text-base jiggle-hover"
              >
                🙈 Hide
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
