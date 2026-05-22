import { useState, useCallback, useEffect } from 'react'
import { GameState, Category, Player, RowVideo } from '../types'
import { getRowCompletionVideo, getRowCompletionMessage } from '../data/videos'

// If applying `newCategories` just completed a same-value row (every question
// at that point value is now resolved), return a RowVideo descriptor pointing
// at the assigned clip. Otherwise null. `closedValue` is the value of the
// question that was just resolved on this transition — we only need to check
// that row, since no other row can have changed.
const detectRowVideo = (
  newCategories: Category[],
  closedValue: number
): RowVideo | null => {
  // Was this same-value row already fully resolved before? If so, this
  // transition didn't complete it — guard against re-firing.
  const allValues = Array.from(
    new Set(newCategories.flatMap((cat) => cat.questions.map((q) => q.value)))
  ).sort((a, b) => a - b)
  const rowIndex = allValues.indexOf(closedValue)
  if (rowIndex < 0) return null

  const rowQuestions = newCategories.flatMap((cat) =>
    cat.questions.filter((q) => q.value === closedValue)
  )
  const rowDone = rowQuestions.every((q) => q.status !== 'unanswered')
  if (!rowDone) return null

  const videoSrc = getRowCompletionVideo(rowIndex)
  if (!videoSrc) return null

  return {
    rowIndex,
    value: closedValue,
    videoSrc,
    message: getRowCompletionMessage(rowIndex),
    startedAt: Date.now(),
  }
}

const allQuestionsResolved = (categories: Category[]): boolean =>
  categories.every((cat) => cat.questions.every((q) => q.status !== 'unanswered'))

const STORAGE_KEY = (sessionId: string) => `jeopardy-${sessionId}`

// Compare two GameStates ignoring updatedAt (which the save effect bumps on
// every write). Used to short-circuit cross-tab / cross-event ping-pong loops.
const isSameState = (a: GameState, b: GameState): boolean => {
  const { updatedAt: _a, ...restA } = a
  const { updatedAt: _b, ...restB } = b
  return JSON.stringify(restA) === JSON.stringify(restB)
}

// Merge a remote GameState into the local one. Players are unioned by id
// (remote wins on conflict so GM-authoritative score/buzzedIn updates
// propagate) — otherwise a new join published from one tab would clobber
// other players' rows. Categories are preserved when remote has none yet.
const mergeRemote = (prev: GameState, remote: GameState): GameState => {
  const playersById = new Map<string, Player>()
  for (const p of prev.players) playersById.set(p.id, p)
  for (const p of remote.players) playersById.set(p.id, p)
  return {
    ...remote,
    players: Array.from(playersById.values()),
    categories: remote.categories?.length > 0 ? remote.categories : prev.categories,
  }
}

export const useGameState = (sessionId: string, isGameMaster: boolean, playerId: string) => {
  // Load from localStorage SYNCHRONOUSLY in the initializer. If we load in a
  // useEffect instead, mount-time init effects in caller components (e.g.
  // GameMaster.initializeGame) see categories=[] on first render and
  // reinitialize, clobbering the persisted phase back to 'setup'.
  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY(sessionId))
      if (saved) return JSON.parse(saved) as GameState
    } catch (e) {
      console.error('Failed to load game state:', e)
    }
    return {
      sessionId,
      phase: 'setup',
      players: [],
      categories: [],
      currentQuestion: null,
      lastCorrectPlayerId: null,
      buzzerOrder: [],
      excludedPlayerIds: [],
      celebration: null,
      rowVideo: null,
      isGameMaster,
      updatedAt: Date.now(),
    }
  })

  // Sync state to localStorage whenever it changes (persists across page reloads)
  useEffect(() => {
    const stateToSave = { ...gameState, updatedAt: Date.now() }
    try {
      localStorage.setItem(STORAGE_KEY(sessionId), JSON.stringify(stateToSave))
    } catch (e) {
      console.error('Failed to save game state:', e)
    }
  }, [gameState, sessionId])

  // Listen for state changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY(sessionId) && e.newValue) {
        try {
          const remote = JSON.parse(e.newValue) as GameState
          setGameState((prev) => {
            const merged = mergeRemote(prev, remote)
            return isSameState(prev, merged) ? prev : merged
          })
        } catch (err) {
          console.error('Failed to parse storage change:', err)
        }
      }
    }

    const handleCustomEvent = (e: Event) => {
      if (e instanceof CustomEvent) {
        setGameState((prev) => {
          const remote = e.detail as GameState
          const merged = mergeRemote(prev, remote)
          return isSameState(prev, merged) ? prev : merged
        })
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

  // Player-side direct write. Used as a fallback when Ably isn't configured
  // (single-browser dev). In production the player calls useAblyGameState.buzzIn
  // which routes through Ably -> GM acceptBuzz to avoid the local-decision race.
  const buzzIn = useCallback(() => {
    if (isGameMaster) return

    setGameState((prev) => {
      const player = prev.players.find((p) => p.id === playerId)
      if (!player || player.buzzedIn) return prev
      if (prev.excludedPlayerIds.includes(playerId)) return prev
      if (prev.phase !== 'buzz-ready') return prev
      if (prev.buzzerOrder.length > 0) return prev

      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, buzzedIn: true } : p
        ),
        buzzerOrder: [playerId],
        phase: 'answered',
      }
    })
  }, [isGameMaster, playerId])

  // GM-authoritative buzz acceptance. Called when a buzz-request arrives over
  // Ably. Validates against current state and writes the winner. Because only
  // the GM ever calls this, there is a single decision point — Ably's per-
  // channel FIFO ordering at the GM client is what picks the winner.
  const acceptBuzz = useCallback((buzzerPlayerId: string) => {
    if (!isGameMaster) return

    setGameState((prev) => {
      if (prev.phase !== 'buzz-ready') return prev
      if (prev.buzzerOrder.length > 0) return prev
      if (prev.excludedPlayerIds.includes(buzzerPlayerId)) return prev
      const player = prev.players.find((p) => p.id === buzzerPlayerId)
      if (!player) return prev

      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === buzzerPlayerId ? { ...p, buzzedIn: true } : p
        ),
        buzzerOrder: [buzzerPlayerId],
        phase: 'answered',
      }
    })
  }, [isGameMaster])

  const markAnswered = useCallback((answererPlayerId: string, correct: boolean) => {
    if (!isGameMaster || !gameState.currentQuestion) return

    setGameState((prev) => {
      if (!prev.currentQuestion) return prev

      if (correct) {
        // CORRECT: award points, mark question correct (green), enter the
        // 'celebrating' phase. The question stays open (currentQuestion is
        // preserved) so the modal can show the answer reveal + celebration
        // + optional video. We exit this phase via continueAfterCelebration.
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
          lastCorrectPlayerId: answererPlayerId,
          buzzerOrder: [],
          excludedPlayerIds: [],
          phase: 'celebrating',
          celebration: {
            questionId: prev.currentQuestion.id,
            playerId: answererPlayerId,
            startedAt: Date.now(),
          },
        }
      } else {
        // WRONG: subtract the question's value (real Jeopardy scoring), exclude
        // the player, reset their buzzer state. If other non-excluded players
        // remain, go back to 'buzz-ready' so they can try; otherwise stay in
        // 'answered' so GM can decide to reveal.
        const newExcluded = [...prev.excludedPlayerIds, answererPlayerId]

        const newPlayers = prev.players.map((p) => {
          if (p.id !== answererPlayerId) return p
          return {
            ...p,
            score: p.score - prev.currentQuestion!.value,
            buzzedIn: false,
            answered: false,
          }
        })

        // Check if there are any remaining players who can buzz in.
        // newExcluded already contains answererPlayerId, so this check alone is sufficient.
        const remainingPlayersCanBuzz = prev.players.some(
          (p) => !newExcluded.includes(p.id)
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

  // Reveal the answer and close the question, marking it as incorrect (red).
  // If closing this question completes a same-value row, transition into the
  // 'row-video' phase to play the assigned clip; otherwise straight to
  // 'playing' (or 'finished' if every question is now resolved).
  const revealAndCloseQuestion = useCallback(() => {
    if (!isGameMaster || !gameState.currentQuestion) return

    setGameState((prev) => {
      if (!prev.currentQuestion) return prev

      const closedValue = prev.currentQuestion.value
      const newCategories = prev.categories.map((cat) => ({
        ...cat,
        questions: cat.questions.map((q) =>
          q.id === prev.currentQuestion!.id ? { ...q, status: 'incorrect' as const } : q
        ),
      }))

      const rowVideo = detectRowVideo(newCategories, closedValue)
      const allDone = allQuestionsResolved(newCategories)
      const nextPhase: GameState['phase'] = rowVideo ? 'row-video' : allDone ? 'finished' : 'playing'

      return {
        ...prev,
        categories: newCategories,
        currentQuestion: null,
        phase: nextPhase,
        buzzerOrder: [],
        excludedPlayerIds: [],
        celebration: null,
        rowVideo,
        players: prev.players.map((p) => ({
          ...p,
          buzzedIn: false,
          answered: false,
        })),
      }
    })
  }, [isGameMaster, gameState.currentQuestion])

  // After the post-correct celebration, GM presses Continue. Closes the
  // question. If the just-correct question's value-row is now complete,
  // enters 'row-video' phase to play the assigned clip; otherwise returns to
  // 'playing' (or 'finished' if every question is resolved).
  const continueAfterCelebration = useCallback(() => {
    if (!isGameMaster) return

    setGameState((prev) => {
      if (prev.phase !== 'celebrating') return prev

      // The question is already marked 'correct' in categories. Find its
      // value via celebration.questionId so we know which row to evaluate.
      const closedQ = prev.categories
        .flatMap((cat) => cat.questions)
        .find((q) => q.id === prev.celebration?.questionId)
      const rowVideo = closedQ ? detectRowVideo(prev.categories, closedQ.value) : null
      const allDone = allQuestionsResolved(prev.categories)
      const nextPhase: GameState['phase'] = rowVideo ? 'row-video' : allDone ? 'finished' : 'playing'

      return {
        ...prev,
        currentQuestion: null,
        celebration: null,
        rowVideo,
        buzzerOrder: [],
        excludedPlayerIds: [],
        phase: nextPhase,
        players: prev.players.map((p) => ({
          ...p,
          buzzedIn: false,
          answered: false,
        })),
      }
    })
  }, [isGameMaster])

  // After the row-completion video, GM presses Continue. Clears the rowVideo
  // and flips to 'finished' if every question is resolved, else 'playing'.
  const continueAfterRowVideo = useCallback(() => {
    if (!isGameMaster) return

    setGameState((prev) => {
      if (prev.phase !== 'row-video') return prev

      const allDone = allQuestionsResolved(prev.categories)
      return {
        ...prev,
        rowVideo: null,
        phase: allDone ? 'finished' : 'playing',
      }
    })
  }, [isGameMaster])

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

  // GM-side counterpart of addPlayer: lets GM add a player whose playerId
  // isn't `playerId` (i.e. someone other than GM). Used by the Ably
  // `join-request` handler so GM is the sole authoritative writer for the
  // players list — mirrors the GM-authoritative buzz model.
  const acceptJoin = useCallback((newPlayerId: string, playerName: string) => {
    if (!isGameMaster) return
    setGameState((prev) => {
      if (prev.players.some((p) => p.id === newPlayerId)) return prev
      return {
        ...prev,
        players: [
          ...prev.players,
          {
            id: newPlayerId,
            name: playerName,
            score: 0,
            buzzedIn: false,
            answered: false,
            joinedAt: Date.now(),
          },
        ],
      }
    })
  }, [isGameMaster])

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
    acceptBuzz,
    markAnswered,
    revealAndCloseQuestion,
    continueAfterCelebration,
    continueAfterRowVideo,
    addPlayer,
    acceptJoin,
    resetBuzzers,
    testBuzz,
  }
}