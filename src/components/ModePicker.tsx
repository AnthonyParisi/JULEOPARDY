interface ModePickerProps {
  onPick: (mode: 'solo' | 'multi') => void
  ablyAvailable: boolean
}

export default function ModePicker({ onPick, ablyAvailable }: ModePickerProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-300 via-white to-red-200 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <h1 className="text-3xl md:text-4xl font-black text-red-600 text-center drop-shadow-lg mb-6">
          🎉 JULEOPARDY 🎉
        </h1>
        <p className="text-center text-pink-600 font-bold mb-8">How are you playing?</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Solo */}
          <button
            onClick={() => onPick('solo')}
            className="bg-white hover:bg-yellow-50 rounded-2xl shadow-xl p-6 border-4 border-pink-400 text-left transition transform hover:scale-105 cursor-pointer"
          >
            <div className="text-5xl mb-3">🎮</div>
            <h2 className="text-2xl font-black text-red-600 mb-2">Solo Mode</h2>
            <p className="text-pink-700 font-semibold text-sm mb-2">Run the show yourself.</p>
            <p className="text-gray-600 text-sm">
              Type in player names, then play the whole game from this browser — no phones needed.
              Click a player's ✓ to award points or ✗ to subtract.
            </p>
          </button>

          {/* Multi-device */}
          <button
            onClick={() => ablyAvailable && onPick('multi')}
            disabled={!ablyAvailable}
            title={ablyAvailable ? undefined : 'Multi-device mode requires VITE_ABLY_KEY to be configured.'}
            className={`rounded-2xl shadow-xl p-6 border-4 text-left transition ${
              ablyAvailable
                ? 'bg-white hover:bg-yellow-50 border-pink-400 transform hover:scale-105 cursor-pointer'
                : 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="text-5xl mb-3">📱</div>
            <h2 className="text-2xl font-black text-red-600 mb-2">Multi-device</h2>
            <p className="text-pink-700 font-semibold text-sm mb-2">Players use their phones.</p>
            <p className="text-gray-600 text-sm">
              Players scan a QR code to join from their own devices and buzz in remotely.
              {!ablyAvailable && (
                <span className="block mt-2 text-red-500 font-bold">Requires VITE_ABLY_KEY.</span>
              )}
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}
