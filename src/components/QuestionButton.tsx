interface QuestionButtonProps {
  value: number
  status: 'unanswered' | 'correct' | 'incorrect'
  onClick: () => void
}

export default function QuestionButton({
  value,
  status,
  onClick,
}: QuestionButtonProps) {
  const isDisabled = status !== 'unanswered'

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`rounded-lg p-4 font-bold text-2xl transition min-w-[150px] ${
        status === 'correct'
          ? 'bg-green-700 text-green-300 cursor-default'
          : status === 'incorrect'
            ? 'bg-red-700 text-red-300 cursor-default'
            : 'bg-jeopardy-blue text-jeopardy-gold hover:bg-blue-700 active:scale-95'
      }`}
    >
      {status === 'correct' ? '✓' : status === 'incorrect' ? '✗' : `$${value}`}
    </button>
  )
}
