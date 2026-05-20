import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import { nanoid } from 'nanoid'
import Lobby from './components/Lobby'
import GameMaster from './components/GameMaster'
import PlayerJoin from './components/PlayerJoin'
import PlayerBuzzer from './components/PlayerBuzzer'

function AppContent() {
  const [searchParams] = useSearchParams()
  const [sessionId, setSessionId] = useState<string>('')
  const [playerId, setPlayerId] = useState<string>('')
  const [isGameMaster, setIsGameMaster] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

  useEffect(() => {
    // Check if this is a game master session (no sessionId param = new session)
    const paramSessionId = searchParams.get('session')
    const paramPlayerId = searchParams.get('player')
    const isMaster = searchParams.get('master') === 'true'

    if (paramSessionId) {
      setSessionId(paramSessionId)
      setPlayerId(paramPlayerId || nanoid())
      setIsGameMaster(isMaster)
    } else {
      // Create new game master session
      const newSessionId = nanoid(6)
      const newPlayerId = nanoid()
      setSessionId(newSessionId)
      setPlayerId(newPlayerId)
      setIsGameMaster(true)
      // Update URL to include session ID
      window.history.pushState(null, '', `?session=${newSessionId}&player=${newPlayerId}&master=true`)
    }
  }, [searchParams])

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
                onBackToLobby={() => setGameStarted(false)}
              />
            ) : (
              <Lobby
                sessionId={sessionId}
                playerId={playerId}
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
