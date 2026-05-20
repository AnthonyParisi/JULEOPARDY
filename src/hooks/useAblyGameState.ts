import { useEffect, useRef } from 'react'
import * as Ably from 'ably'
import { useGameState } from './useGameState'
import { GameState } from '../types'

// Get the Ably key from Vite environment
const ABLY_KEY = import.meta.env.VITE_ABLY_KEY || ''

export const useAblyGameState = (sessionId: string, isGameMaster: boolean, playerId: string) => {
  const gameHook = useGameState(sessionId, isGameMaster, playerId)
  const { gameState, initializeGame, startGame, selectQuestion, buzzIn, markAnswered, revealAndCloseQuestion, addPlayer, resetBuzzers, testBuzz } = gameHook

  const ablyRef = useRef<Ably.Realtime | null>(null)
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)
  const lastPublishedRef = useRef<string>('')

  const channelName = `jeopardy-${sessionId}`

  // Connect to Ably and subscribe to channel
  useEffect(() => {
    if (!ABLY_KEY) {
      console.warn('[Ably] No API key found. Game sync across devices will not work.')
      return
    }

    console.log('[Ably] Connecting...')
    let cancelled = false

    const connect = async () => {
      try {
        const ably = new Ably.Realtime(ABLY_KEY)
        ablyRef.current = ably

        await ably.connection.once('connected')
        if (cancelled) return
        console.log('[Ably] Connected')

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
      } catch (err) {
        console.error('[Ably] Connection error:', err)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      if (ablyRef.current) {
        ablyRef.current.close()
        ablyRef.current = null
      }
    }
  }, [channelName])

  // Publish state changes to Ably whenever gameState changes
  useEffect(() => {
    if (!channelRef.current || !ABLY_KEY) return

    const stateStr = JSON.stringify(gameState)
    if (stateStr === lastPublishedRef.current) return
    lastPublishedRef.current = stateStr

    channelRef.current.publish('state-update', gameState).catch((err) => {
      console.error('[Ably] Publish error:', err)
    })
  }, [gameState])

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
