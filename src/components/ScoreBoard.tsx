import { Player } from '../types'

interface ScoreBoardProps {
  players: Player[]
  currentPlayerIndex: number
}

export default function ScoreBoard({ players, currentPlayerIndex }: ScoreBoardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {players.map((player, idx) => (
        <div
          key={player.id}
          className={`rounded-lg p-6 text-center transition transform ${
            idx === currentPlayerIndex
              ? 'bg-jeopardy-gold scale-105 shadow-lg'
              : 'bg-jeopardy-blue'
          }`}
        >
          <p className={`text-lg font-bold ${idx === currentPlayerIndex ? 'text-jeopardy-dark' : 'text-white'}`}>
            {player.name}
          </p>
          <p className={`text-3xl font-bold mt-2 ${idx === currentPlayerIndex ? 'text-jeopardy-dark' : 'text-jeopardy-gold'}`}>
            ${player.score}
          </p>
        </div>
      ))}
    </div>
  )
}
