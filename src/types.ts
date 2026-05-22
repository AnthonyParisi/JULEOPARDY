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

export interface Celebration {
  questionId: string
  playerId: string
  startedAt: number
}

export interface RowVideo {
  // Index into the sorted-ascending list of unique point values on the board.
  rowIndex: number
  // The point value that defines this row (for display / debugging).
  value: number
  // Resolved video URL from CELEBRATION_VIDEOS[rowIndex].
  videoSrc: string
  // Optional celebratory text shown as a popup before the video plays.
  // Empty string means no intro popup — go straight to the video.
  message: string
  startedAt: number
}

export interface GameState {
  sessionId: string
  phase: 'setup' | 'playing' | 'buzz-ready' | 'answered' | 'celebrating' | 'row-video' | 'finished'
  players: Player[]
  categories: Category[]
  currentQuestion: Question | null
  lastCorrectPlayerId: string | null
  buzzerOrder: string[]
  excludedPlayerIds: string[]
  // Active correct-answer celebration. Question modal stays open showing the
  // answer + a celebration animation; the GM presses Continue to advance.
  celebration: Celebration | null
  // Active row-completion video. Full-screen overlay plays the assigned clip;
  // the GM presses Continue when it ends to return to the board (or to the
  // finished screen if every row is done).
  rowVideo: RowVideo | null
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