# Jeopardy Party

A remote-multiplayer Jeopardy web game. One Game Master runs the board on a big screen; players join from their phones via QR code and buzz in.

## Features

- One Game Master + many players, each on their own device
- Realtime sync via [Ably](https://ably.com/) (one free key required)
- QR code in the lobby for players to scan and join
- Spacebar / tap-to-buzz on player devices
- Wrong-answer flow: missing players are excluded so others get a shot
- Reveal Answer / Move On controls when nobody gets it
- Score tracking, persisted to `localStorage` per session

## Setup

### Prerequisites
- Node.js 18+
- An Ably account (free tier is fine) — sign up at https://ably.com/ and copy an API key

### Install

```bash
npm install
```

### Configure Ably

Create a `.env.local` in the project root:

```
VITE_ABLY_KEY=your-ably-api-key-here
```

Without this, the game still runs but state will NOT sync between devices.

### Run the dev server

```bash
npm run dev
```

Vite is configured with `host: '0.0.0.0'`, so the dev server is reachable from other devices on your LAN. Open the URL printed under "Network:" (e.g. `http://192.168.x.x:5173`) on the Game Master device. The QR code in the lobby uses that same origin, so players scanning it will land on the join page automatically.

If you're hosting from a machine whose LAN IP doesn't show up in `window.location` (uncommon), you can override the host used by the QR code:

```
VITE_LAN_HOST=192.168.0.42:5173
```

## Build

```bash
npm run build
npm run preview
```

Output goes to `dist/`. `vite.config.ts` uses `base: './'`, so the build works whether you serve it from the site root or from a subdirectory like `/<repo-name>/` on GitHub Pages — no further config needed. The included GitHub Actions workflow deploys to GitHub Pages on push to `main`.

## How to Play

1. The first device to open the app becomes the Game Master.
2. Players scan the QR code (or open the join URL) on their phones and enter a name.
3. The Game Master clicks "Start Game" when everyone has joined.
4. The Game Master picks a question from the board.
5. Players see the question and tap BUZZ (or press Spacebar).
6. The first buzzer answers out loud; the Game Master marks it ✓ Correct or ✗ Wrong.
7. Wrong answers exclude that player from the current question — others can still buzz.
8. If nobody gets it, the Game Master hits "Reveal Answer" and "Move On".
9. Repeat until the board is finished.

## Customizing Questions

Edit `public/questions.json` — it's loaded fresh from the lobby on every game start (no rebuild required in dev; just refresh):

```json
{
  "categories": [
    {
      "name": "Category Name",
      "clues": [
        { "value": 100, "question": "Your question?", "answer": "The answer" }
      ]
    }
  ]
}
```

The bundled `src/data/questions.ts` is only used as a fallback if `questions.json` can't be loaded.

## Customizing Row Videos

Drop video files into `public/videos/` and list their paths in `src/data/videos.ts`. The positional mapping is "row 0 = lowest point value on the board" — so `CELEBRATION_VIDEOS[0]` plays when every $100 question is resolved, `[1]` for $200, and so on. Leave entries blank to skip a row.

## Tech

React 18 · TypeScript · Vite · Tailwind · Ably Realtime · React Router

## License

MIT
