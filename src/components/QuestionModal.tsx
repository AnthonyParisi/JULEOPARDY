import { useState } from 'react'
import { Question, Player } from '../types'

interface QuestionModalProps {
  question: Question
  isDailyDouble: boolean
  currentPlayer: Player
  onAnswerCorrect: () => void
  onAnswerWrong: () => void
  onWager: (wager: number) => void
}

export default function QuestionModal({
  question,
  isDailyDouble,
  currentPlayer,
  onAnswerCorrect,
  onAnswerWrong,
  onWager,
}: QuestionModalProps) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [showWagerPrompt, setShowWagerPrompt] = useState(isDailyDouble)
  const [wager, setWager] = useState(Math.min(question.value, currentPlayer.score))
  const [maxWager] = useState(Math.max(question.value, currentPlayer.score))

  const handleWagerSubmit = () => {
    onWager(wager)
    setShowWagerPrompt(false)
  }

  const handleCorrect = () => {
    onAnswerCorrect()
  }

  const handleWrong = () => {
    onAnswerWrong()
  }

  if (showWagerPrompt) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-jeopardy-dark rounded-lg p-8 max-w-md w-full border-4 border-jeopardy-gold">
          <h2 className="text-2xl font-bold text-jeopardy-gold mb-4">DAILY DOUBLE!</h2>
          <p className="text-white text-xl mb-6">{currentPlayer.name}, place your wager</p>

          <div className="mb-6">
            <input
              type="range"
              min="0"
              max={maxWager}
              value={wager}
              onChange={(e) => setWager(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-jeopardy-gold text-3xl font-bold text-center mt-4">${wager}</p>
          </div>

          <button
            onClick={handleWagerSubmit}
            className="w-full bg-jeopardy-gold text-jeopardy-dark font-bold text-lg py-3 rounded-lg hover:bg-yellow-400"
          >
            Confirm Wager
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-jeopardy-dark rounded-lg p-8 max-w-2xl w-full border-4 border-jeopardy-gold">
        <p className="text-jeopardy-gold text-sm mb-4 font-semibold">
          {currentPlayer.name} - ${currentPlayer.score}
        </p>

        <div className="bg-jeopardy-blue rounded-lg p-6 mb-6 min-h-[100px] flex items-center justify-center">
          <p className="text-white text-2xl font-bold text-center">{question.question}</p>
        </div>

        {showAnswer && (
          <div className="bg-jeopardy-gold rounded-lg p-6 mb-6 min-h-[80px] flex items-center justify-center">
            <p className="text-jeopardy-dark text-2xl font-bold text-center">{question.answer}</p>
          </div>
        )}

        <div className="flex gap-4 flex-wrap">
          {!showAnswer && (
            <button
              onClick={() => setShowAnswer(true)}
              className="flex-1 min-w-[150px] bg-jeopardy-gold text-jeopardy-dark font-bold py-3 rounded-lg hover:bg-yellow-400"
            >
              Reveal Answer
            </button>
          )}

          {showAnswer && (
            <>
              <button
                onClick={handleCorrect}
                className="flex-1 min-w-[150px] bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700"
              >
                ✓ Correct
              </button>
              <button
                onClick={handleWrong}
                className="flex-1 min-w-[150px] bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700"
              >
                ✗ Wrong
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
