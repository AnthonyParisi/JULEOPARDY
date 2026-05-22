import { test, expect, Browser, BrowserContext, Page } from '@playwright/test'

// Three isolated browser contexts so each tab gets its own localStorage / nanoid playerId.
async function newTab(browser: Browser, label: string): Promise<{ ctx: BrowserContext; page: Page; label: string }> {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  page.on('console', (msg) => {
    const t = msg.type()
    if (t === 'error' || t === 'warning' || (t === 'log' && msg.text().startsWith('[Ably'))) {
      console.log(`[${label} ${t}]`, msg.text())
    }
  })
  page.on('pageerror', (err) => console.log(`[${label} pageerror]`, err.message))
  page.on('request', (req) => {
    const u = req.url()
    if (u.includes('ably')) console.log(`[${label} req] ${req.method()} ${u.slice(0, 140)}`)
  })
  page.on('websocket', (ws) => {
    console.log(`[${label} ws-open]`, ws.url().slice(0, 140))
    ws.on('framesent', (f) => {
      const s = typeof f.payload === 'string' ? f.payload : f.payload.toString('utf-8')
      if (s.includes('state-update') || s.includes('buzz-request') || s.includes('"action"')) {
        console.log(`[${label} ws→]`, s.slice(0, 250))
      }
    })
    ws.on('framereceived', (f) => {
      const s = typeof f.payload === 'string' ? f.payload : f.payload.toString('utf-8')
      if (s.includes('state-update') || s.includes('buzz-request') || s.includes('"action"')) {
        console.log(`[${label} ws←]`, s.slice(0, 250))
      }
    })
  })
  return { ctx, page, label }
}

test('full game walkthrough — lobby, buzz race, refresh, reveal', async ({ browser }) => {
  const gm = await newTab(browser, 'GM')
  const alice = await newTab(browser, 'Alice')
  const bob = await newTab(browser, 'Bob')

  // --- 1. GM lands on lobby, captures sessionId from URL ---
  await gm.page.goto('/')
  // Root URL now shows ModePicker — pick Multi-device to get into the old flow.
  await gm.page.getByRole('button', { name: /Multi-device/ }).click()
  await gm.page.waitForURL(/\?session=/)
  const gmUrl = gm.page.url()
  const sessionId = new URL(gmUrl).searchParams.get('session')!
  expect(sessionId).toBeTruthy()
  console.log('GM session:', sessionId, 'URL:', gmUrl)

  // GM types name and clicks Add to register themselves as a player
  await gm.page.getByPlaceholder('Your name').fill('GameMaster')
  await gm.page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(gm.page.getByText("✓ You're in!")).toBeVisible()

  // --- 2. Two players join via the shared session URL ---
  const joinUrl = `/?session=${sessionId}&master=false`

  for (const [tab, name] of [
    [alice, 'Alice'] as const,
    [bob, 'Bob'] as const,
  ]) {
    await tab.page.goto(joinUrl)
    await tab.page.getByPlaceholder('Enter your name').fill(name)
    await tab.page.getByRole('button', { name: /Join/ }).click()
    await expect(tab.page.getByText("You're In!")).toBeVisible()
  }

  // Debug: dump localStorage from each tab to see what state each one thinks is current
  for (const t of [gm, alice, bob]) {
    const ls = await t.page.evaluate(() => {
      const out: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!
        out[k] = localStorage.getItem(k)!
      }
      return out
    })
    console.log(`[${t.label} localStorage]`, JSON.stringify(ls))
  }

  // GM should now see 3 players in the lobby (GM + Alice + Bob)
  await expect(gm.page.getByText('Players (3)')).toBeVisible({ timeout: 10000 })

  // --- 3. GM starts the game ---
  await gm.page.getByRole('button', { name: /START GAME/ }).click()

  // GM should land on the board (a $100 cell button should exist)
  await expect(gm.page.getByRole('button', { name: '$100' }).first()).toBeVisible({ timeout: 5000 })

  // Wait a moment and dump phase from each tab's localStorage
  await alice.page.waitForTimeout(2500)
  const readPhase = (p: Page) => p.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!
      if (k.startsWith('jeopardy-')) return JSON.parse(localStorage.getItem(k)!)
    }
    return null
  })
  const [gmLS, aliceLS, bobLS] = await Promise.all([readPhase(gm.page), readPhase(alice.page), readPhase(bob.page)])
  console.log('[diag] GM phase:', gmLS?.phase, 'players:', gmLS?.players?.length)
  console.log('[diag] Alice phase:', aliceLS?.phase, 'players:', aliceLS?.players?.length)
  console.log('[diag] Bob phase:', bobLS?.phase, 'players:', bobLS?.players?.length)

  // Players should advance to the buzzer screen (the buzzer placeholder text is shown
  // before any question is selected; it changes to "🔔 BUZZ" once GM opens one)
  await expect(alice.page.getByText('Waiting for question...')).toBeVisible({ timeout: 10000 })
  await expect(bob.page.getByText('Waiting for question...')).toBeVisible({ timeout: 10000 })

  // --- 4. GM selects a $100 question ---
  await gm.page.getByRole('button', { name: '$100' }).first().click()

  // QuestionDisplay modal opens on GM with question + reveal-answer controls
  await expect(gm.page.getByText('CATEGORY')).toBeVisible()

  // Capture the question and answer text from GM tab for cross-check on player tabs
  const gmQuestionText = await gm.page
    .locator('p.text-2xl.font-bold.text-center.text-red-600, p.text-3xl.font-bold.text-center.text-red-600')
    .first()
    .textContent()
  console.log('GM sees question:', gmQuestionText)

  // --- 5. CRITICAL: players see question text but NOT the answer text yet ---
  // Reveal answer on GM so we have the answer string to search for
  await gm.page.getByRole('button', { name: /Reveal Answer/ }).click()
  const gmAnswerText = await gm.page.locator('p.text-2xl.font-black.text-center.text-red-600, p.text-3xl.font-black.text-center.text-red-600').first().textContent()
  console.log('GM answer:', gmAnswerText)

  // Now verify the answer is NOT visible on either player tab.
  // (At this point GM has revealed it locally — but Ably should NOT propagate the local showAnswer toggle since that's GM component state, not gameState.)
  for (const [tab, name] of [
    [alice, 'Alice'] as const,
    [bob, 'Bob'] as const,
  ]) {
    const bodyText = await tab.page.locator('body').textContent()
    expect(bodyText, `${name} should NOT see answer text "${gmAnswerText}"`).not.toContain(gmAnswerText!.trim())
  }

  // Close out this question by hitting Move On
  await gm.page.getByRole('button', { name: /Move On/ }).click()
  await expect(gm.page.getByText('CATEGORY')).not.toBeVisible()

  // --- 6. Buzz race: open a new question, both players click BUZZ as close together as possible ---
  await gm.page.getByRole('button', { name: '$200' }).first().click()
  await expect(gm.page.getByText('CATEGORY')).toBeVisible()

  // Wait until both players see the question is open (phase = buzz-ready → BUZZ button is enabled / not disabled)
  // We check by waiting for the question text to appear in their buzzer view.
  await expect(alice.page.getByText(/CATEGORY|^\$200$/).first()).toBeVisible({ timeout: 5000 }).catch(() => {})

  // Fire both buzzes in parallel
  await Promise.all([
    alice.page.getByRole('button', { name: /^🔔 BUZZ$/ }).click().catch(() => alice.page.keyboard.press(' ')),
    bob.page.getByRole('button', { name: /^🔔 BUZZ$/ }).click().catch(() => bob.page.keyboard.press(' ')),
  ])

  // GM should see exactly one buzzer; capture who won
  await expect(gm.page.getByText(/Buzzed:/)).toBeVisible({ timeout: 5000 })
  const winnerName = (await gm.page.locator('text=Buzzed:').locator('xpath=following-sibling::p').first().textContent())?.trim()
  console.log('Buzz winner:', winnerName)
  expect(['GameMaster', 'Alice', 'Bob']).toContain(winnerName)

  // Loser tab should show "<winner> is answering"
  const loser = winnerName === 'Alice' ? bob : alice
  await expect(loser.page.getByText(new RegExp(`${winnerName} is answering`))).toBeVisible({ timeout: 5000 })

  // --- 7. GM marks correct → score updates everywhere; modal auto-closes (Correct
  //        sets currentQuestion=null, which unmounts QuestionDisplay)
  await gm.page.getByRole('button', { name: /✓ Correct/ }).click()
  await expect(gm.page.getByText('CATEGORY')).not.toBeVisible({ timeout: 5000 })

  // Winner's score should be 200 on their own tab
  const winnerTab = winnerName === 'Alice' ? alice : winnerName === 'Bob' ? bob : gm
  await expect(winnerTab.page.locator('text=$200').first()).toBeVisible({ timeout: 5000 })

  // --- 8. GM mid-game refresh — should land back on the board, NOT lobby ---
  await gm.page.reload()
  // After refresh, GM should see the board (a question button) not the QR-code lobby
  await expect(gm.page.getByRole('button', { name: /\$[0-9]+/ }).first()).toBeVisible({ timeout: 10000 })
  // And should NOT see the lobby's "Scan to Join!" text
  await expect(gm.page.getByText('Scan to Join!')).not.toBeVisible()

  // --- 9. Player mid-game refresh — should auto-rejoin, NOT bounce to name entry ---
  await alice.page.reload()
  // Expect: BUZZ button visible, NOT "Enter your name" input
  // (Per my source-reading concern, this MAY fail because player tabs don't persist playerId in URL)
  try {
    await expect(alice.page.getByRole('button', { name: /BUZZ|BUZZED|⏳|⏰/ })).toBeVisible({ timeout: 5000 })
    console.log('PASS: Alice auto-rejoined after refresh')
  } catch {
    const stillOnJoin = await alice.page.getByPlaceholder('Enter your name').isVisible().catch(() => false)
    console.log(
      stillOnJoin
        ? 'FAIL: Alice bounced back to name-entry screen after refresh (playerId not persisted)'
        : 'FAIL: Alice landed somewhere unexpected after refresh'
    )
    throw new Error('Player refresh did not auto-rejoin')
  }

  await gm.ctx.close()
  await alice.ctx.close()
  await bob.ctx.close()
})
