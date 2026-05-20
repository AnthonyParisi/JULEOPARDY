# Jeopardy Clone

A fun local multiplayer Jeopardy web game built with React and TypeScript.

## Features

- 🎮 Local multiplayer support (2-4 players)
- 🎯 5 categories with 5 difficulty levels each ($200-$1000)
- 💎 Daily Double support with wagering
- 🏆 Score tracking for all players
- 📱 Responsive design with Tailwind CSS
- ⚡ Built with Vite for fast development

## Setup

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/jeopardy-game.git
cd jeopardy-game
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

## Building for Production

```bash
npm run build
npm run preview
```

The built files will be in the `dist/` directory.

## GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages:

1. Update the repository name in your GitHub settings
2. Push to the `main` branch
3. The GitHub Actions workflow will automatically build and deploy to `https://yourusername.github.io/jeopardy-game`

To set this up, update the `vite.config.ts` base URL:
```typescript
base: '/your-repo-name/',
```

## How to Play

1. Select the number of players (2-4)
2. Enter player names
3. Players take turns selecting a question by its dollar value
4. The current player's category will be highlighted
5. After a question is revealed, click "Reveal Answer" to see the correct answer
6. Mark the answer as correct (✓) or wrong (✗)
7. Score is updated automatically
8. Daily Doubles appear randomly - place your wager!
9. Game ends when all questions are answered
10. Final results show the winner and final scores

## Customizing Questions

Edit `src/data/questions.ts` to add your own questions. Follow this format:

```typescript
{
  category: 'Category Name',
  questions: [
    {
      value: 200,
      question: 'Your question here?',
      answer: 'The answer',
    },
    // ... more questions
  ],
}
```

## Technologies Used

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Hooks for state management

## License

MIT
