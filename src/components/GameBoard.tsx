import { Category } from '../types'
import CategoryColumn from './CategoryColumn'

interface GameBoardProps {
  categories: Category[]
  onSelectQuestion: (categoryIndex: number, questionIndex: number) => void
}

export default function GameBoard({ categories, onSelectQuestion }: GameBoardProps) {
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-5 gap-3 min-w-max mx-auto px-4">
        {categories.map((category, idx) => (
          <CategoryColumn
            key={category.name}
            category={category}
            categoryIndex={idx}
            onSelectQuestion={onSelectQuestion}
          />
        ))}
      </div>
    </div>
  )
}
