import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import { nanoid } from 'nanoid'
import Lobby from './components/Lobby'
import GameMaster from './components/GameMaster'
import PlayerJoin from './components/PlayerJoin'
import PlayerBuzzer from './components/PlayerBuzzer'
import ModePicker from './components/ModePicker'

function AppContent() {
  const [searchParams] = useSearchParams()
  const [sessionId, setSessionId] = useState<string>('')
  const [playerId, setPlayerId] = useState<string>('')
  const [isGameMaster, setIsGameMaster] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [mode, setMode] = useState<'solo' | 'multi'>('multi')
  const [needsPicker, setNeedsPicker] = useState(false)
  // Guard against StrictMode double-invoke. Without this, the effect runs
  // twice in dev, generates two sessionIds, and pushes two URLs — the second
  // URL wins but the first sessionId may already be wired through Ably
  // subscriptions, breaking cross-tab sync.
  const resolvedRef = useRef(false)

  useEffect(() => {
    if (resolvedRef.current) return
    resolvedRef.current = true

    const paramSessionId = searchParams.get('session')
    const paramPlayerId = searchParams.get('player')
    const isMaster = searchParams.get('master') === 'true'
    const paramMode = searchParams.get('mode') === 'solo' ? 'solo' : 'multi'

    if (paramSessionId) {
      // Stable playerId across refreshes: persist it in the URL the first
      // time we mint one for a player tab so reload-auto-rejoin works.
      const pid = paramPlayerId || nanoid()
      setSessionId(paramSessionId)
      setPlayerId(pid)
      setIsGameMaster(isMaster)
      setMode(paramMode)
      if (!paramPlayerId) {
        const next = new URLSearchParams(searchParams)
        next.set('player', pid)
        window.history.replaceState(null, '', `?${next.toString()}`)
      }
    } else {
      // No session in URL — show the mode picker. Session is generated only
      // after the user picks a mode (handlePick below).
      setNeedsPicker(true)
    }
  }, [searchParams])

  const handlePick = (pickedMode: 'solo' | 'multi') => {
    const newSessionId = nanoid(6)
    const newPlayerId = nanoid()
    setSessionId(newSessionId)
    setPlayerId(newPlayerId)
    setIsGameMaster(true)
    setMode(pickedMode)
    setNeedsPicker(false)
    const params = new URLSearchParams({
      session: newSessionId,
      player: newPlayerId,
      master: 'true',
    })
    if (pickedMode === 'solo') params.set('mode', 'solo')
    window.history.replaceState(null, '', `?${params.toString()}`)
  }

  if (needsPicker) {
    return <ModePicker onPick={handlePick} ablyAvailable={Boolean(import.meta.env.VITE_ABLY_KEY)} />
  }
  if (!sessionId) {
    return <div className="flex items-center justify-center min-h-screen bg-pink-200">Loading...</div>
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isGameMaster ? (
            gameStarted ? (
              <GameMaster
                sessionId={sessionId}
                playerId={playerId}
                mode={mode}
                onBackToLobby={() => setGameStarted(false)}
              />
            ) : (
              <Lobby
                sessionId={sessionId}
                playerId={playerId}
                mode={mode}
                onGameStart={() => setGameStarted(true)}
              />
            )
          ) : gameStarted ? (
            <PlayerBuzzer sessionId={sessionId} playerId={playerId} />
          ) : (
            <PlayerJoin sessionId={sessionId} playerId={playerId} onGameStart={() => setGameStarted(true)} />
          )
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
