import { test, expect } from '@playwright/test'

test('solo mode: pick → add players → play → refresh persistence', async ({ browser }) => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  page.on('pageerror', (err) => console.log('[pageerror]', err.message))

  // --- 1. Root URL → ModePicker ---
  await page.goto('/')
  await expect(page.getByText('Solo Mode')).toBeVisible()
  await expect(page.getByText('Multi-device')).toBeVisible()

  // --- 2. Pick Solo → URL gets mode=solo, lobby renders (no QR) ---
  await page.getByRole('button', { name: /Solo Mode/ }).click()
  await page.waitForURL(/mode=solo/)
  await expect(page.getByPlaceholder('Add player name')).toBeVisible()
  await expect(page.getByText('Scan to Join!')).not.toBeVisible()

  // --- 3. Add Alice + Bob, remove and re-add Alice ---
  await page.getByPlaceholder('Add player name').fill('Alice')
  await page.getByPlaceholder('Add player name').press('Enter')
  await page.getByPlaceholder('Add player name').fill('Bob')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Alice' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Bob' })).toBeVisible()

  await page.getByRole('button', { name: 'Remove Alice' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Alice' })).not.toBeVisible()
  await page.getByPlaceholder('Add player name').fill('Alice')
  await page.getByPlaceholder('Add player name').press('Enter')
  await expect(page.getByRole('listitem').filter({ hasText: 'Alice' })).toBeVisible()

  // --- 4. Start the game ---
  await page.getByRole('button', { name: /START GAME/ }).click()
  await expect(page.getByRole('button', { name: '$200' }).first()).toBeVisible({ timeout: 5000 })

  // Both players should be in the GM scoreboard
  await expect(page.locator('text=Alice').first()).toBeVisible()
  await expect(page.locator('text=Bob').first()).toBeVisible()

  // --- 5. Open a $200 question, mark Alice wrong (−$200), then Bob right (+$200) ---
  await page.getByRole('button', { name: '$200' }).first().click()
  await expect(page.getByText('CATEGORY')).toBeVisible()

  // Solo grid should show per-player ✓/✗ buttons (no buzz step)
  const aliceWrong = page.getByRole('button', { name: /✗ −\$200/ }).first()
  await aliceWrong.click()
  // Alice's score in the GM scoreboard is now -$200
  await expect(page.locator('text=$-200').first()).toBeVisible({ timeout: 3000 })
  // Modal still open (Bob can still answer)
  await expect(page.getByText('CATEGORY')).toBeVisible()

  // Click Bob's ✓
  const bobCorrect = page.getByRole('button', { name: /✓ \+\$200/ }).first()
  await bobCorrect.click()
  // Modal auto-closes once Correct fires
  await expect(page.getByText('CATEGORY')).not.toBeVisible({ timeout: 3000 })
  // Bob's score is $200
  await expect(page.locator('text=$200').first()).toBeVisible()

  // --- 6. Refresh — should land back on the board with scores intact ---
  await page.reload()
  await expect(page.getByRole('button', { name: /\$[0-9]+/ }).first()).toBeVisible({ timeout: 5000 })
  await expect(page.getByText('Solo Mode')).not.toBeVisible() // not bounced to picker
  await expect(page.locator('text=Alice').first()).toBeVisible()
  await expect(page.locator('text=Bob').first()).toBeVisible()

  // --- 7. Open another question and use Reveal Answer (no one got it) ---
  await page.getByRole('button', { name: '$400' }).first().click()
  await expect(page.getByText('CATEGORY')).toBeVisible()
  await page.getByRole('button', { name: /Reveal Answer/ }).click()
  await page.getByRole('button', { name: /Move On/ }).click()
  await expect(page.getByText('CATEGORY')).not.toBeVisible({ timeout: 3000 })

  await ctx.close()
})
