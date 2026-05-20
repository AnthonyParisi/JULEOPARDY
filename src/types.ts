export interface Question {
  id: string
  category: string
  value: number
  question: string
  answer: string
  status: 'unanswered' | 'correct' | 'incorrect'
}

export interface Category {
  name: string
  questions: Question[]
}

export interface Player {
  id: string
  name: string
  score: number
  buzzedIn: boolean
  answered: boolean
  joinedAt: number
}

export interface GameState {
  sessionId: string
  phase: 'setup' | 'playing' | 'buzz-ready' | 'answered' | 'finished'
  players: Player[]
  categories: Category[]
  currentQuestion: Question | null
  lastCorrectPlayerId: string | null
  buzzerOrder: string[]
  excludedPlayerIds: string[]
  isGameMaster: boolean
  updatedAt: number
}

export interface GameSession {
  sessionId: string
  isGameMaster: boolean
  playerId: string
  playerName: string
}

export interface BuzzEvent {
  playerId: string
  playerName: string
  timestamp: number
}