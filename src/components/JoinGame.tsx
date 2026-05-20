import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameState } from '../hooks/useGameState'

interface JoinGameProps {
  sessionId: string
  playerId: string
}

export default function JoinGame({ sessionId, playerId }: JoinGameProps) {
  const navigate = useNavigate()
  const [playerName, setPlayerName] = useState('')
  const { addPlayer } = useGameState(sessionId, false, playerId)

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (playerName.trim()) {
      addPlayer(playerName)
      navigate('/play')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-blue-900 text-center mb-2">JEOPARDY!</h1>
        <p className="text-center text-gray-600 mb-8">Join the Game</p>

        <div className="bg-yellow-400 text-blue-900 rounded-lg p-4 mb-8 text-center">
          <p className="text-sm font-semibold mb-1">Session ID</p>
          <p className="text-3xl font-bold font-mono">{sessionId}</p>
        </div>

        <form onSubmit={handleJoin}>
          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
              className="w-full px-4 py-3 border-2 border-blue-900 rounded-lg focus:outline-none focus:border-yellow-400"
            />
          </div>

          <button
            type="submit"
            disabled={!playerName.trim()}
            className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition text-xl"
          >
            Join Game
          </button>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          Waiting for game to start...
        </p>
      </div>
    </div>
  )
}
