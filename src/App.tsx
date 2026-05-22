import { useState, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'
import Lobby from './components/Lobby'
import GameMaster from './components/GameMaster'

export default function App() {
  const [sessionId, setSessionId] = useState<string>('')
  const [playerId, setPlayerId] = useState<string>('')
  const [gameStarted, setGameStarted] = useState(false)
  // Guard against StrictMode double-invoke; without this, the effect runs twice
  // in dev and we'd generate two sessionIds (and two localStorage buckets).
  const resolvedRef = useRef(false)

  useEffect(() => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    setSessionId(nanoid(6))
    setPlayerId(nanoid())
  }, [])

  if (!sessionId) {
    return <div className="flex items-center justify-center min-h-screen bg-pink-200">Loading...</div>
  }

  return gameStarted ? (
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
}
