import { Category } from '../types'
import { QUESTIONS_DATA } from './questions'

// JSON schema in public/questions.json:
//   { "categories": [{ "name": "...", "clues": [{ "value", "question", "answer" }] }] }
// This is the source of truth at runtime — the bundled QUESTIONS_DATA is
// only used as a fallback if the fetch fails.
interface JsonClue {
  value: number
  question: string
  answer: string
}
interface JsonCategory {
  name: string
  clues: JsonClue[]
}
interface JsonRoot {
  categories: JsonCategory[]
}

const mapJsonToCategories = (root: JsonRoot): Category[] =>
  root.categories.map((cat) => ({
    name: cat.name,
    questions: cat.clues.map((q, idx) => ({
      id: `${cat.name}-${idx}`,
      category: cat.name,
      value: q.value,
      question: q.question,
      answer: q.answer,
      status: 'unanswered' as const,
    })),
  }))

export const fallbackCategoriesFromBundle = (): Category[] =>
  QUESTIONS_DATA.map((cat) => ({
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

// Fetch the current questions from public/questions.json. `cache: 'no-store'`
// is important — without it, edits to the JSON file don't show up until a
// hard refresh because the browser/SW happily serves the old copy.
// BASE_URL handles deployment under a subdirectory (e.g. GitHub Pages).
export async function loadQuestionsFromPublic(): Promise<Category[]> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}questions.json`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as JsonRoot
    if (!data?.categories?.length) throw new Error('no categories in JSON')
    return mapJsonToCategories(data)
  } catch (err) {
    console.warn(
      '[questions] Failed to load /questions.json; using bundled fallback.',
      err
    )
    return fallbackCategoriesFromBundle()
  }
}
