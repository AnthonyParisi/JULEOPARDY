import { Player } from '../types'

interface GameOverProps {
  players: Player[]
  onPlayAgain: () => void
}

export default function GameOver({ players, onPlayAgain }: GameOverProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const winner = sortedPlayers[0]

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-jeopardy-dark rounded-lg shadow-2xl p-8 max-w-lg w-full border-4 border-jeopardy-gold text-center">
        <h1 className="text-4xl font-bold text-jeopardy-gold mb-4">GAME OVER!</h1>

        <div className="mb-8">
          <p className="text-white text-2xl font-bold mb-2">Winner:</p>
          <p className="text-jeopardy-gold text-3xl font-bold">{winner.name}</p>
          <p className="text-white text-2xl font-bold mt-2">${winner.score}</p>
        </div>

        <div className="mb-8 bg-jeopardy-blue rounded-lg p-6">
          <p className="text-white text-lg font-bold mb-4">Final Scores:</p>
          <div className="space-y-2">
            {sortedPlayers.map((player, idx) => (
              <div key={player.id} className="flex justify-between text-white">
                <span className="font-semibold">
                  {idx + 1}. {player.name}
                </span>
                <span className="text-jeopardy-gold font-bold">${player.score}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onPlayAgain}
          className="w-full bg-jeopardy-gold text-jeopardy-dark font-bold text-xl py-4 rounded-lg hover:bg-yellow-400 transition"
        >
          Play Again
        </button>
      </div>
    </div>
  )
}
