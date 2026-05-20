import { useState } from 'react'

interface PlayerSetupProps {
  onStartGame: (count: number, names: string[]) => void
}

export default function PlayerSetup({ onStartGame }: PlayerSetupProps) {
  const [playerCount, setPlayerCount] = useState(2)
  const [playerNames, setPlayerNames] = useState(Array(2).fill(''))

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames]
    newNames[index] = name
    setPlayerNames(newNames)
  }

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count)
    setPlayerNames(Array(count).fill('').map((_, i) => `Player ${i + 1}`))
  }

  const handleStart = () => {
    const names = playerNames.map((name, i) => name || `Player ${i + 1}`)
    onStartGame(playerCount, names)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-jeopardy-dark rounded-lg shadow-2xl p-8 max-w-lg w-full border-4 border-jeopardy-gold">
        <h1 className="text-4xl font-bold text-jeopardy-gold text-center mb-8">JEOPARDY!</h1>

        <div className="mb-8">
          <label className="text-white text-lg font-semibold mb-4 block">
            Number of Players
          </label>
          <div className="flex gap-4">
            {[2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => handlePlayerCountChange(num)}
                className={`flex-1 py-3 rounded-lg font-bold text-lg transition ${
                  playerCount === num
                    ? 'bg-jeopardy-gold text-jeopardy-dark'
                    : 'bg-jeopardy-blue text-white hover:bg-blue-600'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <label className="text-white text-lg font-semibold mb-4 block">
            Player Names
          </label>
          <div className="space-y-3">
            {Array.from({ length: playerCount }).map((_, i) => (
              <input
                key={i}
                type="text"
                placeholder={`Player ${i + 1}`}
                value={playerNames[i]}
                onChange={(e) => handleNameChange(i, e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-jeopardy-gold"
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full bg-jeopardy-gold text-jeopardy-dark font-bold text-xl py-4 rounded-lg hover:bg-yellow-400 transition"
        >
          Start Game
        </button>
      </div>
    </div>
  )
}
