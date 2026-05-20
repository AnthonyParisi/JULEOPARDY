import { useState, useCallback, useEffect } from 'react'
import { GameState, Player, Question, Category } from '../types'
import { nanoid } from 'nanoid'

const STORAGE_KEY = (sessionId: string) => `jeopardy-${sessionId}`

export const useGameState = (sessionId: string, isGameMaster: boolean, playerId: string) => {
  const [gameState, setGameState] = useState<GameState>({
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
  })

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY(sessionId))
    if (saved) {
      try {
        setGameState(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load game state:', e)
      }
    }
  }, [sessionId])

  // Sync state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = { ...gameState, updatedAt: Date.now() }
    localStorage.setItem(STORAGE_KEY(sessionId), JSON.stringify(stateToSave))

    // Broadcast to other tabs
    window.dispatchEvent(
      new CustomEvent('game-state-changed', { detail: stateToSave })
    )
  }, [gameState, sessionId])

  // Listen for state changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY(sessionId) && e.newValue) {
        try {
          setGameState(JSON.parse(e.newValue))
        } catch (err) {
          console.error('Failed to parse storage change:', err)
        }
      }
    }

    const handleCustomEvent = (e: Event) => {
      if (e instanceof CustomEvent) {
        setGameState(e.detail)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('game-state-changed', handleCustomEvent)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('game-state-changed', handleCustomEvent)
    }
  }, [sessionId])

  const initializeGame = useCallback((categories: Category[]) => {
    setGameState((prev) => ({
      ...prev,
      phase: 'setup',
      categories,
      currentQuestion: null,
      buzzerOrder: [],
      excludedPlayerIds: [],
    }))
  }, [])

  const startGame = useCallback(() => {
    if (!isGameMaster) return
    setGameState((prev) => ({
      ...prev,
      phase: 'playing',
    }))
  }, [isGameMaster])

  const selectQuestion = useCallback((categoryIndex: number, questionIndex: number) => {
    if (!isGameMaster) return

    setGameState((prev) => {
      const question = prev.categories[categoryIndex]?.questions[questionIndex]
      if (!question || question.status !== 'unanswered') return prev

      return {
        ...prev,
        currentQuestion: question,
        phase: 'buzz-ready',
        buzzerOrder: [],
        excludedPlayerIds: [],
        players: prev.players.map((p) => ({
          ...p,
          buzzedIn: false,
          answered: false,
        })),
      }
    })
  }, [isGameMaster])

  const buzzIn = useCallback(() => {
    if (isGameMaster) return

    setGameState((prev) => {
      const player = prev.players.find((p) => p.id === playerId)
      if (!player || player.buzzedIn) return prev
      // Excluded players cannot buzz in
      if (prev.excludedPlayerIds.includes(playerId)) return prev

      const isFirstTobuzz = prev.buzzerOrder.length === 0

      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, buzzedIn: true } : p
        ),
        buzzerOrder: [...prev.buzzerOrder, playerId],
        phase: isFirstTobuzz ? 'answered' : prev.phase,
      }
    })
  }, [isGameMaster, playerId])

  const markAnswered = useCallback((answererPlayerId: string, correct: boolean) => {
    if (!isGameMaster || !gameState.currentQuestion) return

    setGameState((prev) => {
      if (!prev.currentQuestion) return prev

      if (correct) {
        // CORRECT: award points, mark question as correct (green), close question
        const newPlayers = prev.players.map((p) => {
          if (p.id === answererPlayerId) {
            return {
              ...p,
              score: p.score + prev.currentQuestion!.value,
              answered: true,
            }
          }
          return p
        })

        const newCategories = prev.categories.map((cat) => ({
          ...cat,
          questions: cat.questions.map((q) =>
            q.id === prev.currentQuestion!.id ? { ...q, status: 'correct' as const } : q
          ),
        }))

        return {
          ...prev,
          players: newPlayers,
          categories: newCategories,
          currentQuestion: null,
          lastCorrectPlayerId: correct ? answererPlayerId : prev.lastCorrectPlayerId,
          buzzerOrder: [],
          excludedPlayerIds: [],
          phase: 'playing',
        }
      } else {
        // WRONG: do NOT mark question as answered. Add player to excluded list.
        // Reset their buzzer state so they can't buzz again on this question.
        // If there are still other non-excluded players who haven't buzzed, go back to 'buzz-ready'.
        // Otherwise, stay in 'answered' phase so GM can decide to reveal and close.
        const newExcluded = [...prev.excludedPlayerIds, answererPlayerId]

        const newPlayers = prev.players.map((p) => ({
          ...p,
          buzzedIn: p.id === answererPlayerId ? false : p.buzzedIn,
          answered: p.id === answererPlayerId ? false : p.answered,
        }))

        // Check if there are any remaining players who can buzz in
        const remainingPlayersCanBuzz = prev.players.some(
          (p) => !newExcluded.includes(p.id) && p.id !== answererPlayerId
        )

        return {
          ...prev,
          players: newPlayers,
          excludedPlayerIds: newExcluded,
          buzzerOrder: [],
          phase: remainingPlayersCanBuzz ? 'buzz-ready' : 'answered',
        }
      }
    })
  }, [isGameMaster, gameState.currentQuestion])

  // Reveal the answer and close the question, marking it as incorrect (red)
  const revealAndCloseQuestion = useCallback(() => {
    if (!isGameMaster || !gameState.currentQuestion) return

    setGameState((prev) => {
      if (!prev.currentQuestion) return prev

      const newCategories = prev.categories.map((cat) => ({
        ...cat,
        questions: cat.questions.map((q) =>
          q.id === prev.currentQuestion!.id ? { ...q, status: 'incorrect' as const } : q
        ),
      }))

      return {
        ...prev,
        categories: newCategories,
        currentQuestion: null,
        phase: 'playing',
        buzzerOrder: [],
        excludedPlayerIds: [],
        players: prev.players.map((p) => ({
          ...p,
          buzzedIn: false,
          answered: false,
        })),
      }
    })
  }, [isGameMaster, gameState.currentQuestion])

  const addPlayer = useCallback((playerName: string) => {
    setGameState((prev) => {
      const playerExists = prev.players.some((p) => p.id === playerId)
      if (playerExists) return prev

      return {
        ...prev,
        players: [
          ...prev.players,
          {
            id: playerId,
            name: playerName,
            score: 0,
            buzzedIn: false,
            answered: false,
            joinedAt: Date.now(),
          },
        ],
      }
    })
  }, [playerId])

  const resetBuzzers = useCallback(() => {
    if (!isGameMaster) return

    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) => ({
        ...p,
        buzzedIn: false,
        answered: false,
      })),
      buzzerOrder: [],
      phase: 'buzz-ready',
    }))
  }, [isGameMaster])

  const testBuzz = useCallback((testPlayerId?: string) => {
    if (!isGameMaster) return

    setGameState((prev) => {
      if (prev.phase !== 'buzz-ready') return prev

      // Determine which player to buzz
      let playerToBuzz: string | undefined

      if (testPlayerId) {
        // Specific player ID was passed - use it
        playerToBuzz = testPlayerId
      } else {
        // No player specified, find the first non-excluded real player
        const firstAvailable = prev.players.find(
          (p) => !prev.excludedPlayerIds.includes(p.id) && !p.buzzedIn
        )
        playerToBuzz = firstAvailable?.id
      }

      if (!playerToBuzz) return prev
      if (prev.excludedPlayerIds.includes(playerToBuzz)) return prev
      if (prev.buzzerOrder.includes(playerToBuzz)) return prev

      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerToBuzz ? { ...p, buzzedIn: true } : p
        ),
        buzzerOrder: [playerToBuzz],
      }
    })
  }, [isGameMaster])

  return {
    gameState,
    initializeGame,
    startGame,
    selectQuestion,
    buzzIn,
    markAnswered,
    revealAndCloseQuestion,
    addPlayer,
    resetBuzzers,
    testBuzz,
  }
}