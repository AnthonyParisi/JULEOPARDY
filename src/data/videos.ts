// Celebration video bank.
//
// Drop video files into `public/videos/` (or anywhere under /public) and add
// their public-URL paths here. After a correct answer, the game randomly
// picks one of these to play, then returns to the answer reveal screen and
// waits for the Game Master to press Continue.
//
// Supported: any format an <video> element supports in modern browsers
// (mp4/H.264, webm). Leave this array empty to skip the video step entirely.
export const CELEBRATION_VIDEOS: string[] = [
  // Examples once you've added files:
  '/videos/V1.mp4',
  '/videos/V2.mp4',
  '/videos/V3.mp4',
  '/videos/V4.mp4',
  '/videos/V5.mp4',
  
]

export const pickRandomVideoIndex = (): number => {
  if (CELEBRATION_VIDEOS.length === 0) return -1
  return Math.floor(Math.random() * CELEBRATION_VIDEOS.length)
}

// Row-completion videos.
//
// When every question at a given point value is resolved (correct OR
// incorrect), the corresponding video below plays. The mapping is positional:
// row 0 = the lowest point value on the board, row 1 = the next, etc.
// CELEBRATION_VIDEOS[rowIndex] is the assigned video; if it's missing or the
// row index is out of range, no video plays for that row.
//
// Paths like '/videos/V1.mp4' are rewritten to honor BASE_URL so they work
// under both `/` (dev) and `/<repo>/` (GitHub Pages) without the user having
// to edit anything.
const withBaseUrl = (src: string): string => {
  if (/^https?:\/\//i.test(src)) return src
  const base = import.meta.env.BASE_URL
  const trimmed = src.replace(/^\/+/, '')
  return base.endsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`
}

export const getRowCompletionVideo = (rowIndex: number): string | null => {
  const src = CELEBRATION_VIDEOS[rowIndex]
  return src ? withBaseUrl(src) : null
}

// Optional celebration popup text shown BEFORE the row video plays.
// Same positional mapping as CELEBRATION_VIDEOS: row 0 = lowest point value,
// row 1 = next, and so on. Leave any entry as '' to skip the popup for that
// row and go straight into the video.
export const ROW_COMPLETION_MESSAGES: string[] = [
  '',
  '',
  '',
  '',
  '',
]

export const getRowCompletionMessage = (rowIndex: number): string => {
  return ROW_COMPLETION_MESSAGES[rowIndex] ?? ''
}
