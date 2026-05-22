import { useEffect, useState } from 'react'
import QRCode from 'qrcode.react'
import { nanoid } from 'nanoid'
import { useAblyGameState } from '../hooks/useAblyGameState'
import { loadQuestionsFromPublic } from '../data/loadQuestions'

interface LobbyProps {
  sessionId: string
  playerId: string
  mode: 'solo' | 'multi'
  onGameStart: () => void
}

export default function Lobby({ sessionId, playerId, mode, onGameStart }: LobbyProps) {
  const { gameState, initializeGame, startGame, addPlayer, acceptJoin } = useAblyGameState(sessionId, true, playerId, mode)
  const [initialized, setInitialized] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [submittedPlayers, setSubmittedPlayers] = useState<{ id: string; name: string }[]>([])

  // Always reload questions from public/questions.json while we're in setup.
  // Lobby is the only place a fresh game starts, and the GM hasn't picked any
  // questions yet — so overwriting cached `categories` here makes JSON edits
  // take effect on every lobby visit. Once `phase` moves past 'setup', the
  // existing categories (with progress) are preserved.
  useEffect(() => {
    if (initialized) return
    if (gameState.phase !== 'setup') {
      setInitialized(true)
      return
    }
    let cancelled = false
    loadQuestionsFromPublic().then((categories) => {
      if (cancelled) return
      initializeGame(categories)
      setInitialized(true)
    })
    return () => {
      cancelled = true
    }
  }, [initialized, gameState.phase, initializeGame])

  // If the game is already past setup (refreshed GM landing on the lobby),
  // jump straight to the game master view.
  useEffect(() => {
    if (gameState.phase !== 'setup' && gameState.phase !== 'finished') {
      onGameStart()
    }
  }, [gameState.phase, onGameStart])

  const handleAddGameMaster = () => {
    if (playerName.trim()) {
      addPlayer(playerName)
      setPlayerName('')
    }
  }

  const handleAddSoloPlayer = () => {
    const trimmed = playerName.trim()
    if (!trimmed) return
    setSubmittedPlayers((prev) => [...prev, { id: nanoid(), name: trimmed }])
    setPlayerName('')
  }

  const handleRemoveSoloPlayer = (id: string) => {
    setSubmittedPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  const handleSoloStart = () => {
    for (const p of submittedPlayers) {
      acceptJoin(p.id, p.name)
    }
    startGame()
  }

  // For QR code: phones won't reach `localhost`, so rewrite the host to a LAN
  // IP whenever the GM is browsing via loopback. Priority:
  //   1. VITE_LAN_HOST explicit override (.env)
  //   2. window.__JEOPARDY_LAN_HOST__ auto-detected by vite.config.ts at startup
  //      (injected via transformIndexHtml — see vite.config.ts)
  //   3. window.location.origin as-is (works if the GM already opened via LAN IP)
  const getJoinUrl = () => {
    const override = import.meta.env.VITE_LAN_HOST as string | undefined
    const autoLan = typeof window !== 'undefined' ? window.__JEOPARDY_LAN_HOST__ : undefined
    const proto = window.location.protocol
    const port = window.location.port
    const hostname = window.location.hostname
    const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'

    let host = hostname
    if (override) host = override
    else if (isLoopback && autoLan) host = autoLan

    const portPart = port ? `:${port}` : ''
    return `${proto}//${host}${portPart}?session=${sessionId}&master=false`
  }

  const joinUrl = getJoinUrl()
  const allPlayersReady = gameState.players.length > 0 && gameState.players.every(p => p.name)

  if (mode === 'solo') {
    const canStart = submittedPlayers.length >= 1
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-300 via-white to-red-200 p-4 flex items-start justify-center">
        <div className="max-w-md w-full mt-8">
          <h1 className="text-2xl md:text-3xl font-black text-red-600 drop-shadow-lg text-center mb-6">
            🎉 JULEOPARDY 🎉
          </h1>

          <div className="bg-white rounded-2xl shadow-xl p-5 border-4 border-pink-400">
            <h2 className="text-lg font-black text-red-600 mb-3">Players</h2>

            {submittedPlayers.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-2">No players yet — add some below.</p>
            ) : (
              <ul className="space-y-2 mb-3">
                {submittedPlayers.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between bg-gradient-to-r from-pink-100 to-red-100 rounded-lg p-2 border-2 border-pink-300"
                  >
                    <span className="font-bold text-red-600">{p.name}</span>
                    <button
                      onClick={() => handleRemoveSoloPlayer(p.id)}
                      className="text-pink-500 hover:text-red-600 font-black px-2"
                      aria-label={`Remove ${p.name}`}
                    >
                      ✖
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Add player name"
                onKeyPress={(e) => e.key === 'Enter' && handleAddSoloPlayer()}
                className="flex-1 px-3 py-2 border-2 border-pink-300 rounded focus:outline-none focus:border-red-500 font-semibold"
                autoFocus
              />
              <button
                onClick={handleAddSoloPlayer}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
              >
                Add
              </button>
            </div>

            <button
              onClick={handleSoloStart}
              disabled={!canStart}
              className={`w-full text-lg font-black py-3 rounded-lg transition transform hover:scale-105 shadow-lg border-3 ${
                canStart
                  ? 'bg-red-500 hover:bg-red-600 text-white border-red-600 cursor-pointer'
                  : 'bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed'
              }`}
            >
              {canStart ? '✨ START GAME ✨' : 'Add a player...'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Multi-device lobby (existing layout)
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-300 via-white to-red-200 p-3 flex flex-col">
      <div className="flex-1 flex flex-col max-w-full overflow-hidden">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-2xl md:text-3xl font-black text-red-600 drop-shadow-lg">
            🎉 JULEOPARDY 🎉
          </h1>
        </div>

        {/* Main Content - Two columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0 overflow-hidden">
          {/* Left: QR Code & Master Setup */}
          <div className="flex flex-col gap-2 min-h-0 overflow-y-auto">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white rounded-lg shadow-lg p-4 border-3 border-pink-400 w-fit max-w-full">
                <QRCode value={joinUrl} size={200} level="H" />
                <p className="text-center text-red-600 font-bold mt-3 text-sm">
                  Scan to Join!
                </p>
                <p className="text-center text-pink-600 font-bold text-sm">
                  {sessionId}
                </p>
                <p
                  className="text-center text-gray-500 font-mono text-[10px] mt-1 break-all max-w-[200px]"
                  title={joinUrl}
                >
                  {joinUrl.replace(/^https?:\/\//, '')}
                </p>
              </div>
            </div>

            {/* Game Master Setup */}
            <div className="bg-white rounded-lg shadow-lg p-3 border-3 border-red-400">
              <h2 className="text-sm font-black text-red-600 mb-2">👑 Game Master</h2>
              <div className="flex gap-1 mb-2">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your name"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddGameMaster()}
                  className="flex-1 px-2 py-2 text-sm border-2 border-pink-300 rounded focus:outline-none focus:border-red-500 font-semibold"
                  autoFocus
                />
                <button
                  onClick={handleAddGameMaster}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded text-sm transition"
                >
                  Add
                </button>
              </div>
              {gameState.players.some(p => p.id === playerId) && (
                <p className="text-green-600 font-bold text-xs">✓ You're in!</p>
              )}
            </div>
          </div>

          {/* Right: Players Lobby */}
          <div className="bg-white rounded-lg shadow-lg p-3 border-3 border-pink-400 flex flex-col min-h-0">
            <h2 className="text-sm font-black text-red-600 mb-2">
              👯 Players ({gameState.players.length})
            </h2>

            {gameState.players.length === 0 ? (
              <p className="text-gray-500 text-xs text-center flex-1 flex items-center justify-center">
                Waiting for players...
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1">
                {gameState.players.map((player) => (
                  <div
                    key={player.id}
                    className="bg-gradient-to-br from-pink-100 to-red-100 rounded p-2 border-2 border-pink-300 shadow-sm"
                  >
                    <p className="text-sm font-black text-red-600">{player.name}</p>
                    <p className="text-gray-600 text-xs">Ready!</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Start Button - Bottom */}
        <div className="text-center mt-2 pt-2 border-t-2 border-pink-300">
          <button
            onClick={() => {
              // Don't also call onGameStart() here — startGame() flips phase to
              // 'playing' and the auto-advance effect above handles the nav.
              // Unmounting Lobby in the same commit as the phase change drops
              // the save effect, so localStorage never gets phase=playing and
              // the GameMaster that mounts next loads stale setup state.
              startGame()
            }}
            disabled={!allPlayersReady}
            className={`text-lg font-black py-3 px-8 rounded-lg transition transform hover:scale-105 shadow-lg border-3 w-full ${
              allPlayersReady
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-600 cursor-pointer'
                : 'bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed'
            }`}
          >
            {allPlayersReady ? '✨ START GAME ✨' : 'Waiting...'}
          </button>
        </div>
      </div>
    </div>
  )
}
