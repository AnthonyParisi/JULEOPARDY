import { useEffect, useState } from 'react'
import { Question } from '../types'

interface QuestionDisplayProps {
  question: Question
  onClose: () => void
  // scoring props - called directly when GM hits Correct/Wrong
  buzzerPlayer?: string | undefined
  buzzerPlayerName?: string | undefined
  onMarkCorrect?: () => void
  onMarkWrong?: () => void
  // wrong-answer flow props
  excludedPlayerIds?: string[]
  allPlayersExcluded?: boolean
  onRevealAndClose?: () => void
  // test buzz props - receives player index (0-based)
  playerCount?: number
  onTestBuzz?: (playerIndex?: number) => void
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
  playerCount = 0,
  onTestBuzz,
}: QuestionDisplayProps) {
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    setShowAnswer(false)
  }, [question.id])

  const canBuzzAgain = !allPlayersExcluded && !buzzerPlayer

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" />

      {/* Question Card with Animation */}
      <div className="relative z-10 w-full h-full flex items-center justify-center animate-scaleIn max-h-screen overflow-y-auto">
        <div className="bg-gradient-to-br from-red-500 via-pink-500 to-red-600 rounded-2xl shadow-2xl p-6 w-full max-w-2xl border-6 border-white my-4">
          {/* Category */}
          <div className="text-white text-center mb-4">
            <p className="text-lg font-black opacity-90 mb-2 drop-shadow">CATEGORY</p>
            <h2 className="text-3xl md:text-4xl font-black drop-shadow">{question.category}</h2>
          </div>

          {/* Question Value */}
          <div className="text-white text-center mb-6">
            <p className="text-5xl md:text-6xl font-black drop-shadow">${question.value}</p>
          </div>

          {/* Question Content */}
          <div className="bg-white rounded-xl p-4 mb-4">
            <p className="text-2xl md:text-3xl font-bold text-center text-red-600 mb-4">
              {question.question}
            </p>

            {showAnswer && (
              <div className="border-t-4 border-red-500 pt-4">
                <p className="text-2xl md:text-3xl font-black text-center text-red-600">
                  {question.answer}
                </p>
              </div>
            )}
          </div>

          {/* Exclusion message */}
          {excludedPlayerIds.length > 0 && !showAnswer && (
            <div className="text-center mb-3">
              <p className="text-white/90 text-sm font-bold">
                {excludedPlayerIds.length === 1
                  ? '1 player got it wrong — others can still buzz in!'
                  : `${excludedPlayerIds.length} players got it wrong — others can still buzz in!`}
              </p>
            </div>
          )}

          {allPlayersExcluded && !showAnswer && (
            <div className="text-center mb-3">
              <p className="text-yellow-300 text-sm font-black">
                All players have tried — time to reveal the answer!
              </p>
            </div>
          )}

          {/* Test Buzz Buttons - accessible within the modal */}
          {onTestBuzz && !buzzerPlayer && (
            <div className="flex gap-2 justify-center mb-3">
              <button
                onClick={() => onTestBuzz(0)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-black py-1 px-3 rounded text-xs transition"
              >
                🔧 Buzz P1
              </button>
              {playerCount >= 2 && (
                <button
                  onClick={() => onTestBuzz(1)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-1 px-3 rounded text-xs transition"
                >
                  🔧 Buzz P2
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-center items-center flex-wrap">
            {/* Scoring controls appear when there's a buzzer player */}
            {buzzerPlayer && onMarkCorrect && onMarkWrong ? (
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
                  className="bg-green-500 hover:bg-green-600 text-white font-black py-2 px-4 rounded-lg transition text-sm md:text-base"
                >
                  ✓ Correct
                </button>
                <button
                  onClick={() => {
                    onMarkWrong()
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-black py-2 px-4 rounded-lg transition text-sm md:text-base"
                >
                  ✗ Wrong
                </button>
              </>
            ) : canBuzzAgain ? (
              <p className="text-white font-bold text-sm">Waiting for a player to buzz in...</p>
            ) : null}

            {/* Reveal Answer button - show when no buzzers active or all players excluded */}
            {(!buzzerPlayer || allPlayersExcluded) && !showAnswer && onRevealAndClose && (
              <button
                onClick={() => setShowAnswer(true)}
                className="bg-yellow-400 hover:bg-yellow-500 text-red-800 font-black py-2 px-4 rounded-lg transition text-sm md:text-base"
              >
                👀 Reveal Answer
              </button>
            )}

            {/* Show/Hide answer toggle (when no scoring flow active) */}
            {!buzzerPlayer && !allPlayersExcluded && !showAnswer && !onRevealAndClose && (
              <button
                onClick={() => setShowAnswer(true)}
                className="bg-white hover:bg-gray-100 text-red-600 font-black py-2 px-4 rounded-lg transition text-sm md:text-base"
              >
                👀 Show Answer
              </button>
            )}

            {/* Close / Move On button */}
            {onRevealAndClose && showAnswer && (
              <button
                onClick={onRevealAndClose}
                className="bg-red-700 hover:bg-red-800 text-white font-black py-2 px-4 rounded-lg transition text-sm md:text-base"
              >
                ✗ Move On (Mark Incorrect)
              </button>
            )}

            {/* Done button (when no onRevealAndClose is provided - player view) */}
            {!onRevealAndClose && (
              <button
                onClick={onClose}
                className="bg-white hover:bg-gray-100 text-pink-600 font-black py-2 px-4 rounded-lg transition text-sm md:text-base"
              >
                ✓ Done
              </button>
            )}

            {/* Show/Hide toggle when answer is already visible */}
            {showAnswer && !onRevealAndClose && (
              <button
                onClick={() => setShowAnswer(false)}
                className="bg-white hover:bg-gray-100 text-red-600 font-black py-2 px-4 rounded-lg transition text-sm md:text-base"
              >
                🙈 Hide
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.8) translateY(-50px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  )
}