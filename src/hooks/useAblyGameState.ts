import { useCallback, useEffect, useRef, useState } from 'react'
import * as Ably from 'ably'
import { useGameState } from './useGameState'
import { GameState } from '../types'

// Get the Ably key from Vite environment
const ABLY_KEY = import.meta.env.VITE_ABLY_KEY || ''

export const useAblyGameState = (
  sessionId: string,
  isGameMaster: boolean,
  playerId: string,
  mode: 'solo' | 'multi' = 'multi'
) => {
  const gameHook = useGameState(sessionId, isGameMaster, playerId)
  const {
    gameState,
    initializeGame,
    startGame,
    selectQuestion,
    buzzIn: buzzInLocal,
    acceptBuzz,
    acceptJoin,
    markAnswered,
    revealAndCloseQuestion,
    continueAfterCelebration,
    continueAfterRowVideo,
    addPlayer: addPlayerLocal,
    resetBuzzers,
    testBuzz,
  } = gameHook

  const ablyRef = useRef<Ably.Realtime | null>(null)
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)
  const lastPublishedRef = useRef<string>('')
  const publishTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Connection readiness is state (not ref) so the publish effect re-runs
  // once Ably is actually ready — otherwise any state changes that happen
  // during the connection window are silently dropped.
  const [channelReady, setChannelReady] = useState(false)
  // acceptBuzz / acceptJoin change identity each render; refs keep subscriber
  // closures fresh without resubscribing.
  const acceptBuzzRef = useRef(acceptBuzz)
  useEffect(() => {
    acceptBuzzRef.current = acceptBuzz
  }, [acceptBuzz])
  const acceptJoinRef = useRef(acceptJoin)
  useEffect(() => {
    acceptJoinRef.current = acceptJoin
  }, [acceptJoin])

  const channelName = `jeopardy-${sessionId}`

  // Connect to Ably and subscribe to channel
  useEffect(() => {
    if (mode === 'solo') {
      // Solo mode: single browser, no cross-tab sync needed. Skip Ably entirely.
      return
    }
    if (!ABLY_KEY) {
      console.warn('[Ably] No VITE_ABLY_KEY found. Cross-device sync is disabled.')
      return
    }

    let cancelled = false

    const connect = async () => {
      try {
        const ably = new Ably.Realtime(ABLY_KEY)
        ablyRef.current = ably

        await ably.connection.once('connected')
        if (cancelled) return

        const channel = ably.channels.get(channelName)
        channelRef.current = channel

        // Subscribe to game state updates from others
        channel.subscribe('state-update', (message) => {
          if (cancelled) return
          const remoteState = message.data as unknown as GameState
          const stateStr = JSON.stringify(remoteState)
          if (stateStr === lastPublishedRef.current) return

          window.dispatchEvent(
            new CustomEvent('game-state-changed', { detail: remoteState })
          )
        })

        // GM-only: be the single authoritative writer for shared state.
        // Players publish `buzz-request` and `join-request` events; GM accepts
        // them into local state and re-publishes the full state-update. Same
        // pattern as the buzz model — Ably's per-channel FIFO ordering at the
        // single GM client resolves all conflicts.
        if (isGameMaster) {
          channel.subscribe('buzz-request', (message) => {
            if (cancelled) return
            const data = message.data as { playerId?: string } | undefined
            if (!data?.playerId) return
            acceptBuzzRef.current(data.playerId)
          })
          channel.subscribe('join-request', (message) => {
            if (cancelled) return
            const data = message.data as { playerId?: string; playerName?: string } | undefined
            if (!data?.playerId || !data?.playerName) return
            acceptJoinRef.current(data.playerId, data.playerName)
          })
        }

        setChannelReady(true)
      } catch (err) {
        console.error('[Ably] Connection error:', err)
      }
    }

    connect()

    return () => {
      cancelled = true
      setChannelReady(false)
      if (publishTimeoutRef.current) clearTimeout(publishTimeoutRef.current)
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      if (ablyRef.current) {
        ablyRef.current.close()
        ablyRef.current = null
      }
    }
  }, [channelName, isGameMaster, mode])

  // Publish full state-updates ONLY from the GM. Players publish events
  // (join-request, buzz-request) and trust GM's state-updates as the source
  // of truth — otherwise player publishes with phase=setup would race with
  // GM's startGame and clobber phase back to setup on the GM's own merge.
  useEffect(() => {
    if (mode === 'solo') return
    if (!isGameMaster) return
    if (!channelReady || !channelRef.current || !ABLY_KEY) return

    if (publishTimeoutRef.current) clearTimeout(publishTimeoutRef.current)

    publishTimeoutRef.current = setTimeout(() => {
      const stateStr = JSON.stringify(gameState)
      if (stateStr === lastPublishedRef.current) return
      lastPublishedRef.current = stateStr

      channelRef.current?.publish('state-update', gameState).catch((err) => {
        console.error('[Ably] Publish error:', err)
      })
    }, 50)
  }, [gameState, channelReady, isGameMaster, mode])

  // Player-facing buzz: route via Ably so the GM is the sole arbiter of who
  // buzzed first. If Ably isn't available, fall back to the direct write so
  // single-browser dev mode still works (no race, only one tab anyway).
  const buzzIn = useCallback(() => {
    if (isGameMaster) return
    if (channelRef.current) {
      channelRef.current
        .publish('buzz-request', { playerId, timestamp: Date.now() })
        .catch((err) => console.error('[Ably] buzz publish error:', err))
      return
    }
    buzzInLocal()
  }, [isGameMaster, playerId, buzzInLocal])

  // Player-facing addPlayer: GM-authoritative model. Player records the name
  // locally as "pending"; an effect publishes the join-request as soon as
  // Ably is ready and keeps re-publishing on each remote state-update until
  // GM has accepted (i.e. we appear in players). Without the retry loop, a
  // join clicked before Ably connects would be silently dropped.
  const [pendingJoinName, setPendingJoinName] = useState<string | null>(null)
  const addPlayer = useCallback(
    (playerName: string) => {
      if (isGameMaster) {
        addPlayerLocal(playerName)
        return
      }
      if (!ABLY_KEY) {
        addPlayerLocal(playerName)
        return
      }
      setPendingJoinName(playerName)
    },
    [isGameMaster, addPlayerLocal]
  )

  useEffect(() => {
    if (!pendingJoinName || isGameMaster) return
    if (!channelReady || !channelRef.current) return
    if (gameState.players.some((p) => p.id === playerId)) {
      setPendingJoinName(null)
      return
    }
    channelRef.current
      .publish('join-request', { playerId, playerName: pendingJoinName, timestamp: Date.now() })
      .catch((err) => console.error('[Ably] join publish error:', err))
  }, [pendingJoinName, channelReady, isGameMaster, playerId, gameState.players])

  return {
    gameState,
    initializeGame,
    startGame,
    selectQuestion,
    buzzIn,
    acceptJoin,
    markAnswered,
    revealAndCloseQuestion,
    continueAfterCelebration,
    continueAfterRowVideo,
    addPlayer,
    resetBuzzers,
    testBuzz,
  }
}
