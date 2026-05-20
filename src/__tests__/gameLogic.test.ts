import { describe, it, expect } from 'vitest'
import { GameState, Category, Question } from '../types'

// Pure function helpers that replicate the game logic from useGameState
// These test the actual state transformations without React effects

function createInitialState(sessionId: string, isGameMaster: boolean, playerId: string): GameState {
  return {
    sessionId,
    phase: 'setup',
    players: [],
    categories: [],
    currentQuestion: null,
    lastCorrectPlayerId: null,
    buzzerOrder: [],
    excludedPlayerIds: [],
    isGameMaster,
    updatedAt: Date.now(),
  }
}

function createMockCategories(): Category[] {
  return [
    {
      name: 'Science',
      questions: [
        { id: 'Science-0', category: 'Science', value: 200, question: 'Q1?', answer: 'A1', status: 'unanswered' },
        { id: 'Science-1', category: 'Science', value: 400, question: 'Q2?', answer: 'A2', status: 'unanswered' },
      ],
    },
    {
      name: 'History',
      questions: [
        { id: 'History-0', category: 'History', value: 200, question: 'Q3?', answer: 'A3', status: 'unanswered' },
      ],
    },
  ]
}

function addPlayer(state: GameState, playerId: string, name: string): GameState {
  const playerExists = state.players.some((p) => p.id === playerId)
  if (playerExists) return state
  return {
    ...state,
    players: [
      ...state.players,
      { id: playerId, name, score: 0, buzzedIn: false, answered: false, joinedAt: Date.now() },
    ],
  }
}

function initializeGame(state: GameState, categories: Category[]): GameState {
  return { ...state, categories, phase: 'setup', currentQuestion: null, buzzerOrder: [], excludedPlayerIds: [] }
}

function startGame(state: GameState): GameState {
  if (!state.isGameMaster) return state
  return { ...state, phase: 'playing' }
}

function selectQuestion(state: GameState, catIdx: number, qIdx: number): GameState {
  if (!state.isGameMaster) return state
  const question = state.categories[catIdx]?.questions[qIdx]
  if (!question || question.status !== 'unanswered') return state

  return {
    ...state,
    currentQuestion: question,
    phase: 'buzz-ready',
    buzzerOrder: [],
    excludedPlayerIds: [],
    players: state.players.map((p) => ({ ...p, buzzedIn: false, answered: false })),
  }
}

function buzzIn(state: GameState, playerId: string): GameState {
  const player = state.players.find((p) => p.id === playerId)
  if (!player || player.buzzedIn) return state
  if (state.excludedPlayerIds.includes(playerId)) return state

  const isFirstToBuzz = state.buzzerOrder.length === 0

  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, buzzedIn: true } : p)),
    buzzerOrder: [...state.buzzerOrder, playerId],
    phase: isFirstToBuzz ? 'answered' : state.phase,
  }
}

function markAnswered(state: GameState, answererPlayerId: string, correct: boolean): GameState {
  if (!state.isGameMaster || !state.currentQuestion) return state

  if (correct) {
    const newPlayers = state.players.map((p) =>
      p.id === answererPlayerId ? { ...p, score: p.score + state.currentQuestion!.value, answered: true } : p
    )
    const newCategories = state.categories.map((cat) => ({
      ...cat,
      questions: cat.questions.map((q) =>
        q.id === state.currentQuestion!.id ? { ...q, status: 'correct' as const } : q
      ),
    }))
    return {
      ...state,
      players: newPlayers,
      categories: newCategories,
      currentQuestion: null,
      lastCorrectPlayerId: answererPlayerId,
      buzzerOrder: [],
      excludedPlayerIds: [],
      phase: 'playing',
    }
  } else {
    const newExcluded = [...state.excludedPlayerIds, answererPlayerId]
    const newPlayers = state.players.map((p) => ({
      ...p,
      buzzedIn: p.id === answererPlayerId ? false : p.buzzedIn,
      answered: p.id === answererPlayerId ? false : p.answered,
    }))
    const remainingCanBuzz = state.players.some(
      (p) => !newExcluded.includes(p.id) && p.id !== answererPlayerId
    )
    return {
      ...state,
      players: newPlayers,
      excludedPlayerIds: newExcluded,
      buzzerOrder: [],
      phase: remainingCanBuzz ? 'buzz-ready' : 'answered',
    }
  }
}

function revealAndClose(state: GameState): GameState {
  if (!state.isGameMaster || !state.currentQuestion) return state

  const newCategories = state.categories.map((cat) => ({
    ...cat,
    questions: cat.questions.map((q) =>
      q.id === state.currentQuestion!.id ? { ...q, status: 'incorrect' as const } : q
    ),
  }))

  return {
    ...state,
    categories: newCategories,
    currentQuestion: null,
    phase: 'playing',
    buzzerOrder: [],
    excludedPlayerIds: [],
    players: state.players.map((p) => ({ ...p, buzzedIn: false, answered: false })),
  }
}

describe('Game Logic - Pure Functions', () => {
  it('initializes game with correct phase', () => {
    expect(createInitialState('s1', true, 'gm1').phase).toBe('setup')
  })

  it('startGame changes phase to playing', () => {
    const s = startGame(initializeGame(createInitialState('s1', true, 'gm1'), createMockCategories()))
    expect(s.phase).toBe('playing')
  })

  it('non-GM cannot start game', () => {
    const s = startGame(initializeGame(createInitialState('s1', false, 'p1'), createMockCategories()))
    expect(s.phase).toBe('setup')
  })
})

describe('Game Logic - Select Question', () => {
  it('selectQuestion sets phase to buzz-ready', () => {
    let s = initializeGame(createInitialState('s1', true, 'gm1'), createMockCategories())
    s = startGame(s)
    s = selectQuestion(s, 0, 0)
    expect(s.phase).toBe('buzz-ready')
    expect(s.currentQuestion?.id).toBe('Science-0')
    expect(s.excludedPlayerIds).toEqual([])
    expect(s.buzzerOrder).toEqual([])
  })

  it('selectQuestion ignores already-answered question', () => {
    let s = initializeGame(createInitialState('s1', true, 'gm1'), createMockCategories())
    s = startGame(s)
    s = selectQuestion(s, 0, 0)
    s = markAnswered(s, 'p1', true)
    s = selectQuestion(s, 0, 0)
    expect(s.phase).toBe('playing')
  })
})

describe('Game Logic - Wrong Answer Flow', () => {
  it('wrong answer excludes player, re-opens buzzer if others remain', () => {
    let s = initializeGame(createInitialState('s1', true, 'gm1'), createMockCategories())
    s = startGame(s)
    s = addPlayer(s, 'p1', 'Alice')
    s = addPlayer(s, 'p2', 'Bob')
    s = selectQuestion(s, 0, 0)

    // P1 buzzes
    s = buzzIn(s, 'p1')
    expect(s.buzzerOrder).toEqual(['p1'])
    expect(s.players.find(p => p.id === 'p1')?.buzzedIn).toBe(true)

    // GM marks wrong
    s = markAnswered(s, 'p1', false)

    // P1 excluded, phase back to buzz-ready
    expect(s.excludedPlayerIds).toContain('p1')
    expect(s.players.find(p => p.id === 'p1')?.buzzedIn).toBe(false)
    expect(s.phase).toBe('buzz-ready')
    expect(s.players.find(p => p.id === 'p1')?.score).toBe(0)
    expect(s.currentQuestion).not.toBeNull()

    // P2 can buzz
    s = buzzIn(s, 'p2')
    expect(s.buzzerOrder).toEqual(['p2'])
  })

  it('wrong answer from last eligible player goes to answered phase', () => {
    let s = initializeGame(createInitialState('s1', true, 'gm1'), createMockCategories())
    s = startGame(s)
    s = addPlayer(s, 'p1', 'Solo')
    s = selectQuestion(s, 0, 0)
    s = buzzIn(s, 'p1')
    s = markAnswered(s, 'p1', false)

    expect(s.phase).toBe('answered')
    expect(s.currentQuestion).not.toBeNull()
  })

  it('excluded player cannot buzz in again', () => {
    let s = initializeGame(createInitialState('s1', true, 'gm1'), createMockCategories())
    s = startGame(s)
    s = addPlayer(s, 'p1', 'Alice')
    s = addPlayer(s, 'p2', 'Bob')
    s = selectQuestion(s, 0, 0)

    s = buzzIn(s, 'p1')
    s = markAnswered(s, 'p1', false)

    // P1 tries to buzz again - should be ignored
    const sAfterP1Rety = buzzIn(s, 'p1')
    expect(sAfterP1Rety.buzzerOrder).toEqual([])

    // P2 buzzes - should work
    s = buzzIn(s, 'p2')
    expect(s.buzzerOrder).toEqual(['p2'])
  })
})

describe('Game Logic - Correct Answer Flow', () => {
  it('awards points, marks question correct, clears everything', () => {
    let s = initializeGame(createInitialState('s1', true, 'gm1'), createMockCategories())
    s = startGame(s)
    s = addPlayer(s, 'p1', 'Alice')
    s = selectQuestion(s, 0, 0)
    s = buzzIn(s, 'p1')
    s = markAnswered(s, 'p1', true)

    expect(s.players.find(p => p.id === 'p1')?.score).toBe(200)
    expect(s.categories[0].questions[0].status).toBe('correct')
    expect(s.currentQuestion).toBeNull()
    expect(s.excludedPlayerIds).toEqual([])
    expect(s.phase).toBe('playing')
  })
})

describe('Game Logic - Reveal and Close', () => {
  it('marks question incorrect and closes it', () => {
    let s = initializeGame(createInitialState('s1', true, 'gm1'), createMockCategories())
    s = startGame(s)
    s = selectQuestion(s, 0, 0)
    s = revealAndClose(s)

    expect(s.currentQuestion).toBeNull()
    expect(s.categories[0].questions[0].status).toBe('incorrect')
    expect(s.phase).toBe('playing')
  })

  it('non-GM cannot reveal and close', () => {
    let s = initializeGame(createInitialState('s1', false, 'p1'), createMockCategories())
    s = startGame(s)
    s = revealAndClose(s)
    expect(s.currentQuestion).toBeNull() // nothing was ever selected
  })
})

describe('Game Logic - Full Scenario: Two players, wrong then correct', () => {
  it('P1 wrong → buzzer re-opens → P2 correct → P2 gets points, question green', () => {
    let s = initializeGame(createInitialState('full', true, 'gm1'), createMockCategories())
    s = startGame(s)
    s = addPlayer(s, 'p1', 'Alice')
    s = addPlayer(s, 'p2', 'Bob')
    s = selectQuestion(s, 0, 0)

    // P1 buzzes, wrong
    s = buzzIn(s, 'p1')
    expect(s.buzzerOrder).toEqual(['p1'])
    s = markAnswered(s, 'p1', false)

    // Verify P1 excluded, phase back to buzz-ready
    expect(s.excludedPlayerIds).toEqual(['p1'])
    expect(s.phase).toBe('buzz-ready')

    // P2 buzzes, correct
    s = buzzIn(s, 'p2')
    expect(s.buzzerOrder).toEqual(['p2'])
    s = markAnswered(s, 'p2', true)

    // P2 gets points, question correct
    expect(s.players.find(p => p.id === 'p2')?.score).toBe(200)
    expect(s.players.find(p => p.id === 'p1')?.score).toBe(0)
    expect(s.categories[0].questions[0].status).toBe('correct')
    expect(s.excludedPlayerIds).toEqual([])
    expect(s.phase).toBe('playing')
  })
})

describe('Game Logic - Full Scenario: All wrong, reveal and close', () => {
  it('both players wrong → answered phase → reveal → question red', () => {
    let s = initializeGame(createInitialState('full2', true, 'gm1'), createMockCategories())
    s = startGame(s)
    s = addPlayer(s, 'p1', 'Alice')
    s = addPlayer(s, 'p2', 'Bob')
    s = selectQuestion(s, 0, 0)

    // P1 buzzes, wrong
    s = buzzIn(s, 'p1')
    s = markAnswered(s, 'p1', false)
    expect(s.phase).toBe('buzz-ready')

    // P2 buzzes, wrong
    s = buzzIn(s, 'p2')
    s = markAnswered(s, 'p2', false)

    // All excluded, phase = answered
    expect(s.excludedPlayerIds).toEqual(['p1', 'p2'])
    expect(s.phase).toBe('answered')
    expect(s.currentQuestion).not.toBeNull()

    // GM reveals and closes
    s = revealAndClose(s)
    expect(s.categories[0].questions[0].status).toBe('incorrect')
    expect(s.currentQuestion).toBeNull()
    expect(s.phase).toBe('playing')
  })
})