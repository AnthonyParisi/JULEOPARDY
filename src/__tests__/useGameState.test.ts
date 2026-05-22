import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameState } from '../hooks/useGameState'
import { Category } from '../types'

// Mock localStorage. setItem fires a StorageEvent on the same window so two
// useGameState hooks rendered in the same process see each other's writes —
// browsers normally only fire storage events on OTHER tabs, but the production
// hook listens on the current window so this faithfully exercises the sync path.
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      const oldValue = store[key] ?? null
      if (oldValue === value) return
      store[key] = value
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new StorageEvent('storage', { key, oldValue, newValue: value })
        )
      }
    }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// Helper to create mock categories
function createMockCategories(): Category[] {
  return [
    {
      name: 'Science',
      questions: [
        {
          id: 'Science-0',
          category: 'Science',
          value: 200,
          question: 'Test Q1?',
          answer: 'Ans1',
          status: 'unanswered',
        },
        {
          id: 'Science-1',
          category: 'Science',
          value: 400,
          question: 'Test Q2?',
          answer: 'Ans2',
          status: 'unanswered',
        },
      ],
    },
  ]
}

describe('useGameState - Game Flow', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in setup phase', () => {
    const { result } = renderHook(() => useGameState('test1', true, 'gm1'))
    expect(result.current.gameState.phase).toBe('setup')
    expect(result.current.gameState.players).toEqual([])
    expect(result.current.gameState.currentQuestion).toBeNull()
    expect(result.current.gameState.excludedPlayerIds).toEqual([])
    expect(result.current.gameState.buzzerOrder).toEqual([])
  })

  it('initializeGame sets up categories', () => {
    const { result } = renderHook(() => useGameState('test2', true, 'gm1'))
    act(() => {
      result.current.initializeGame(createMockCategories())
    })
    expect(result.current.gameState.categories.length).toBe(1)
    expect(result.current.gameState.categories[0].questions[0].status).toBe('unanswered')
  })

  it('startGame changes phase to playing', () => {
    const { result } = renderHook(() => useGameState('test3', true, 'gm1'))
    act(() => result.current.initializeGame(createMockCategories()))
    act(() => result.current.startGame())
    expect(result.current.gameState.phase).toBe('playing')
  })

  it('non-GM cannot start the game', () => {
    const { result } = renderHook(() => useGameState('test4', false, 'p1'))
    act(() => result.current.initializeGame(createMockCategories()))
    act(() => result.current.startGame())
    expect(result.current.gameState.phase).toBe('setup')
  })

  it('selectQuestion changes phase to buzz-ready and sets currentQuestion', () => {
    const { result } = renderHook(() => useGameState('test5', true, 'gm1'))
    act(() => result.current.initializeGame(createMockCategories()))
    act(() => result.current.startGame())
    act(() => result.current.selectQuestion(0, 0))
    expect(result.current.gameState.phase).toBe('buzz-ready')
    expect(result.current.gameState.currentQuestion).not.toBeNull()
    expect(result.current.gameState.currentQuestion!.id).toBe('Science-0')
    expect(result.current.gameState.excludedPlayerIds).toEqual([])
  })

  it('selectQuestion does nothing for already-answered question', () => {
    const { result } = renderHook(() => useGameState('test6', true, 'gm1'))
    act(() => result.current.initializeGame(createMockCategories()))
    act(() => result.current.startGame())
    act(() => result.current.selectQuestion(0, 0))
    act(() => {
      result.current.markAnswered('gm1', true)
    })
    // After correct: celebrating -> Continue -> row-video (the $200 row in
    // the single-category mock board is complete after one answer) ->
    // Continue -> playing.
    expect(result.current.gameState.phase).toBe('celebrating')
    act(() => result.current.continueAfterCelebration())
    expect(result.current.gameState.phase).toBe('row-video')
    act(() => result.current.continueAfterRowVideo())
    expect(result.current.gameState.phase).toBe('playing')
    // The question's status is now 'correct', so selecting it again is a no-op.
    act(() => result.current.selectQuestion(0, 0))
    expect(result.current.gameState.phase).toBe('playing')
  })

  it('addPlayer adds a player to the game', () => {
    const { result } = renderHook(() => useGameState('test7', true, 'gm1'))
    act(() => result.current.addPlayer('Alice'))
    expect(result.current.gameState.players.length).toBe(1)
    expect(result.current.gameState.players[0].name).toBe('Alice')
  })
})

describe('useGameState - Wrong Answer Flow', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('wrong answer: marks player excluded, re-opens buzzer if others remain', () => {
    const session = 'wrong-flow-1'
    const { result: gm } = renderHook(() => useGameState(session, true, 'gm1'))
    const { result: p1 } = renderHook(() => useGameState(session, false, 'p1'))
    const { result: p2 } = renderHook(() => useGameState(session, false, 'p2'))

    act(() => gm.current.initializeGame(createMockCategories()))
    act(() => gm.current.startGame())
    // Each player adds themselves from their own device — addPlayer always uses
    // the calling hook's playerId, so the GM cannot add players on their behalf.
    act(() => p1.current.addPlayer('Alice'))
    act(() => p2.current.addPlayer('Bob'))

    act(() => gm.current.selectQuestion(0, 0))
    expect(gm.current.gameState.phase).toBe('buzz-ready')

    act(() => p1.current.buzzIn())
    expect(gm.current.gameState.buzzerOrder).toEqual(['p1'])
    const p1Buzzed = gm.current.gameState.players.find((p) => p.id === 'p1')
    expect(p1Buzzed?.buzzedIn).toBe(true)

    act(() => gm.current.markAnswered('p1', false))

    expect(gm.current.gameState.excludedPlayerIds).toContain('p1')
    const p1After = gm.current.gameState.players.find(p => p.id === 'p1')
    expect(p1After?.buzzedIn).toBe(false)
    expect(gm.current.gameState.phase).toBe('buzz-ready')
    // Wrong answer subtracts the question's value (real Jeopardy scoring)
    expect(p1After?.score).toBe(-200)
    expect(gm.current.gameState.currentQuestion).not.toBeNull()
  })

  it('wrong answer: subtracts question value even when player already has points', () => {
    const session = 'wrong-subtract-running-score'
    const { result: gm } = renderHook(() => useGameState(session, true, 'gm1'))
    const { result: p1 } = renderHook(() => useGameState(session, false, 'p1'))

    act(() => gm.current.initializeGame(createMockCategories()))
    act(() => gm.current.startGame())
    act(() => p1.current.addPlayer('Alice'))

    // Win the first question (+$200)
    act(() => gm.current.selectQuestion(0, 0))
    act(() => p1.current.buzzIn())
    act(() => gm.current.markAnswered('p1', true))
    expect(gm.current.gameState.players.find(p => p.id === 'p1')?.score).toBe(200)

    // Lose the second question (-$400)
    act(() => gm.current.selectQuestion(0, 1))
    act(() => p1.current.buzzIn())
    act(() => gm.current.markAnswered('p1', false))
    expect(gm.current.gameState.players.find(p => p.id === 'p1')?.score).toBe(-200)
  })

  it('wrong answer from last eligible player: phase goes to answered', () => {
    const session = 'wrong-flow-2'
    const { result: gm } = renderHook(() => useGameState(session, true, 'gm1'))
    const { result: p1 } = renderHook(() => useGameState(session, false, 'p1'))

    act(() => gm.current.initializeGame(createMockCategories()))
    act(() => gm.current.startGame())
    // Single player so that wrong answer leaves no one eligible.
    act(() => p1.current.addPlayer('Solo'))
    act(() => gm.current.selectQuestion(0, 0))
    act(() => p1.current.buzzIn())
    act(() => gm.current.markAnswered('p1', false))

    expect(gm.current.gameState.phase).toBe('answered')
    expect(gm.current.gameState.currentQuestion).not.toBeNull()

    act(() => gm.current.revealAndCloseQuestion())
    expect(gm.current.gameState.currentQuestion).toBeNull()
    expect(gm.current.gameState.categories[0].questions[0].status).toBe('incorrect')
    // Closing this question also completed the $200 row in the single-category
    // mock board, so the row-video overlay takes over until GM continues.
    expect(gm.current.gameState.phase).toBe('row-video')
    act(() => gm.current.continueAfterRowVideo())
    expect(gm.current.gameState.phase).toBe('playing')
  })

  it('excluded player cannot buzz in again', () => {
    const session = 'excluded-cant-buzz'
    const { result: gm } = renderHook(() => useGameState(session, true, 'gm1'))
    const { result: p1 } = renderHook(() => useGameState(session, false, 'p1'))
    const { result: p2 } = renderHook(() => useGameState(session, false, 'p2'))

    act(() => gm.current.initializeGame(createMockCategories()))
    act(() => gm.current.startGame())
    act(() => p1.current.addPlayer('Alice'))
    act(() => p2.current.addPlayer('Bob'))
    act(() => gm.current.selectQuestion(0, 0))

    act(() => p1.current.buzzIn())
    act(() => gm.current.markAnswered('p1', false))
    expect(gm.current.gameState.phase).toBe('buzz-ready')

    act(() => p1.current.buzzIn())
    expect(gm.current.gameState.buzzerOrder).toEqual([])

    act(() => p2.current.buzzIn())
    expect(gm.current.gameState.buzzerOrder).toEqual(['p2'])
  })
})

describe('useGameState - Correct Answer Flow', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('correct answer: awards points, marks question correct, clears exclusions', () => {
    const session = 'correct-flow'
    const { result: gm } = renderHook(() => useGameState(session, true, 'gm1'))
    const { result: p1 } = renderHook(() => useGameState(session, false, 'p1'))

    act(() => gm.current.initializeGame(createMockCategories()))
    act(() => gm.current.startGame())
    act(() => gm.current.addPlayer('Alice'))
    act(() => p1.current.addPlayer('Alice'))
    act(() => gm.current.selectQuestion(0, 0))
    act(() => p1.current.buzzIn())
    act(() => gm.current.markAnswered('p1', true))

    const player = gm.current.gameState.players.find(p => p.id === 'p1')
    expect(player?.score).toBe(200)
    expect(gm.current.gameState.categories[0].questions[0].status).toBe('correct')
    // Question stays open during celebration; clears on Continue.
    expect(gm.current.gameState.phase).toBe('celebrating')
    expect(gm.current.gameState.currentQuestion).not.toBeNull()
    expect(gm.current.gameState.celebration?.playerId).toBe('p1')

    act(() => gm.current.continueAfterCelebration())
    expect(gm.current.gameState.currentQuestion).toBeNull()
    expect(gm.current.gameState.celebration).toBeNull()
    expect(gm.current.gameState.excludedPlayerIds).toEqual([])
    // $200 row is now complete in the single-category mock board, so we
    // detour through the row-video overlay before returning to 'playing'.
    expect(gm.current.gameState.phase).toBe('row-video')
    expect(gm.current.gameState.rowVideo?.value).toBe(200)
    act(() => gm.current.continueAfterRowVideo())
    expect(gm.current.gameState.phase).toBe('playing')
    expect(gm.current.gameState.rowVideo).toBeNull()
  })

  it('continueAfterCelebration flips to finished when all questions answered', () => {
    const session = 'finished-flow'
    const { result: gm } = renderHook(() => useGameState(session, true, 'gm1'))

    // Use a tiny board: 1 category, 1 question
    const tinyCategories: Category[] = [
      {
        name: 'OnlyOne',
        questions: [
          { id: 'OnlyOne-0', category: 'OnlyOne', value: 100, question: 'q?', answer: 'a', status: 'unanswered' },
        ],
      },
    ]
    act(() => gm.current.initializeGame(tinyCategories))
    act(() => gm.current.startGame())
    act(() => gm.current.addPlayer('Alice'))
    act(() => gm.current.selectQuestion(0, 0))
    act(() => gm.current.testBuzz('gm1'))
    act(() => gm.current.markAnswered('gm1', true))
    expect(gm.current.gameState.phase).toBe('celebrating')
    act(() => gm.current.continueAfterCelebration())
    // The single $100 row is complete; row-video first, then finished.
    expect(gm.current.gameState.phase).toBe('row-video')
    act(() => gm.current.continueAfterRowVideo())
    expect(gm.current.gameState.phase).toBe('finished')
  })
})

describe('useGameState - testBuzz (debug)', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('testBuzz simulates a player buzzing in', () => {
    const { result: gm } = renderHook(() => useGameState('testBuzz1', true, 'gm1'))
    act(() => gm.current.initializeGame(createMockCategories()))
    act(() => gm.current.startGame())
    act(() => gm.current.addPlayer('Alice'))
    act(() => gm.current.selectQuestion(0, 0))
    act(() => gm.current.testBuzz('gm1'))
    expect(gm.current.gameState.buzzerOrder).toContain('gm1')
  })

  it('testBuzz respects excludedPlayerIds', () => {
    const session = 'testBuzz-excluded'
    const { result: gm } = renderHook(() => useGameState(session, true, 'gm1'))
    const { result: p1 } = renderHook(() => useGameState(session, false, 'p1'))

    act(() => gm.current.initializeGame(createMockCategories()))
    act(() => gm.current.startGame())
    act(() => gm.current.addPlayer('Alice'))
    act(() => p1.current.addPlayer('Alice'))
    act(() => gm.current.selectQuestion(0, 0))
    act(() => p1.current.buzzIn())
    act(() => gm.current.markAnswered('p1', false))
    act(() => gm.current.testBuzz('p1'))
    expect(gm.current.gameState.buzzerOrder).toEqual([])
  })

  it('testBuzz finds first non-excluded player', () => {
    const session = 'testBuzz-auto'
    const { result: gm } = renderHook(() => useGameState(session, true, 'gm1'))
    const { result: p1 } = renderHook(() => useGameState(session, false, 'p1'))
    const { result: p2 } = renderHook(() => useGameState(session, false, 'p2'))

    act(() => gm.current.initializeGame(createMockCategories()))
    act(() => gm.current.startGame())
    act(() => p1.current.addPlayer('Alice'))
    act(() => p2.current.addPlayer('Bob'))
    act(() => gm.current.selectQuestion(0, 0))
    act(() => p1.current.buzzIn())
    act(() => gm.current.markAnswered('p1', false))
    act(() => gm.current.testBuzz())
    expect(gm.current.gameState.buzzerOrder).toContain('p2')
  })

  it('testBuzz does nothing when phase is not buzz-ready', () => {
    const { result: gm } = renderHook(() => useGameState('testBuzz-phase', true, 'gm1'))
    act(() => gm.current.initializeGame(createMockCategories()))
    act(() => gm.current.addPlayer('Alice'))
    act(() => gm.current.testBuzz())
    expect(gm.current.gameState.buzzerOrder).toEqual([])
  })
})

describe('useGameState - revealAndCloseQuestion', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('marks question incorrect and closes it', () => {
    const session = 'reveal'
    const { result: gm } = renderHook(() => useGameState(session, true, 'gm1'))
    act(() => gm.current.initializeGame(createMockCategories()))
    act(() => gm.current.startGame())
    act(() => gm.current.selectQuestion(0, 0))
    act(() => gm.current.revealAndCloseQuestion())
    expect(gm.current.gameState.currentQuestion).toBeNull()
    expect(gm.current.gameState.categories[0].questions[0].status).toBe('incorrect')
    // Single-category mock board: $200 row is complete after this close, so
    // we detour through the row-video overlay first.
    expect(gm.current.gameState.phase).toBe('row-video')
    act(() => gm.current.continueAfterRowVideo())
    expect(gm.current.gameState.phase).toBe('playing')
  })

  it('non-GM cannot reveal and close', () => {
    const session = 'reveal-nogm'
    const { result: gm } = renderHook(() => useGameState(session, true, 'gm1'))
    const { result: player } = renderHook(() => useGameState(session, false, 'p1'))
    act(() => gm.current.initializeGame(createMockCategories()))
    act(() => gm.current.startGame())
    act(() => gm.current.selectQuestion(0, 0))
    act(() => player.current.revealAndCloseQuestion())
    expect(gm.current.gameState.currentQuestion).not.toBeNull()
  })
})