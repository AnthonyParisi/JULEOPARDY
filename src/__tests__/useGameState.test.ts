import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameState } from '../hooks/useGameState'
import { Category } from '../types'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
})()

// Mock window events
const mockDispatchEvent = vi.fn()
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })
Object.defineProperty(globalThis, 'window', {
  value: {
    ...globalThis.window,
    dispatchEvent: mockDispatchEvent,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  },
  writable: true,
})

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
    expect(result.current.gameState.phase).toBe('playing')
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
    act(() => gm.current.addPlayer('Alice'))
    act(() => gm.current.addPlayer('Bob'))
    act(() => p1.current.addPlayer('Alice'))
    act(() => p2.current.addPlayer('Bob'))

    act(() => gm.current.selectQuestion(0, 0))
    expect(gm.current.gameState.phase).toBe('buzz-ready')

    act(() => p1.current.buzzIn())
    expect(gm.current.gameState.buzzerOrder).toEqual(['p1'])
    expect(gm.current.gameState.players[0].buzzedIn).toBe(true)

    act(() => gm.current.markAnswered('p1', false))

    expect(gm.current.gameState.excludedPlayerIds).toContain('p1')
    const p1After = gm.current.gameState.players.find(p => p.id === 'p1')
    expect(p1After?.buzzedIn).toBe(false)
    expect(gm.current.gameState.phase).toBe('buzz-ready')
    expect(p1After?.score).toBe(0)
    expect(gm.current.gameState.currentQuestion).not.toBeNull()
  })

  it('wrong answer from last eligible player: phase goes to answered', () => {
    const session = 'wrong-flow-2'
    const { result: gm } = renderHook(() => useGameState(session, true, 'gm1'))
    const { result: p1 } = renderHook(() => useGameState(session, false, 'p1'))

    act(() => gm.current.initializeGame(createMockCategories()))
    act(() => gm.current.startGame())
    act(() => gm.current.addPlayer('Solo'))
    act(() => p1.current.addPlayer('Solo'))
    act(() => gm.current.selectQuestion(0, 0))
    act(() => p1.current.buzzIn())
    act(() => gm.current.markAnswered('p1', false))

    expect(gm.current.gameState.phase).toBe('answered')
    expect(gm.current.gameState.currentQuestion).not.toBeNull()

    act(() => gm.current.revealAndCloseQuestion())
    expect(gm.current.gameState.currentQuestion).toBeNull()
    expect(gm.current.gameState.phase).toBe('playing')
    expect(gm.current.gameState.categories[0].questions[0].status).toBe('incorrect')
  })

  it('excluded player cannot buzz in again', () => {
    const session = 'excluded-cant-buzz'
    const { result: gm } = renderHook(() => useGameState(session, true, 'gm1'))
    const { result: p1 } = renderHook(() => useGameState(session, false, 'p1'))
    const { result: p2 } = renderHook(() => useGameState(session, false, 'p2'))

    act(() => gm.current.initializeGame(createMockCategories()))
    act(() => gm.current.startGame())
    act(() => gm.current.addPlayer('Alice'))
    act(() => gm.current.addPlayer('Bob'))
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
    expect(gm.current.gameState.currentQuestion).toBeNull()
    expect(gm.current.gameState.excludedPlayerIds).toEqual([])
    expect(gm.current.gameState.phase).toBe('playing')
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
    act(() => gm.current.addPlayer('Alice'))
    act(() => gm.current.addPlayer('Bob'))
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