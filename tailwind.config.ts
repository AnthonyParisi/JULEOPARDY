import { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        jeopardy: {
          dark: '#030B41',
          blue: '#1E90FF',
          gold: '#FFD700',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
