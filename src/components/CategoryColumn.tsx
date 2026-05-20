import { Category } from '../types'
import QuestionButton from './QuestionButton'

interface CategoryColumnProps {
  category: Category
  categoryIndex: number
  onSelectQuestion: (categoryIndex: number, questionIndex: number) => void
}

export default function CategoryColumn({
  category,
  categoryIndex,
  onSelectQuestion,
}: CategoryColumnProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-jeopardy-blue rounded-lg p-4 text-center min-w-[150px]">
        <h2 className="text-white font-bold text-lg">{category.name}</h2>
      </div>
      {category.questions.map((question, qIdx) => (
        <QuestionButton
          key={question.id}
          value={question.value}
          status={question.status}
          onClick={() => onSelectQuestion(categoryIndex, qIdx)}
        />
      ))}
    </div>
  )
}
