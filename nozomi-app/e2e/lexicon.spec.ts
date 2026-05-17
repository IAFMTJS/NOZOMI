import { test, expect } from '@playwright/test'
import { seedOnboarded } from './helpers'

test.describe('Lexicon & context panel', () => {
  test('desktop: tap word opens context panel with gloss', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await seedOnboarded(page)
    await page.goto('/chat')
    await expect(page.locator('[data-testid="context-panel"]')).toBeVisible()
    await page.getByRole('button', { name: '楽しい' }).click()
    await expect(page.locator('[data-testid="context-panel"]')).toContainText('楽しい')
  })

  test('mobile: tap word navigates to word page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await seedOnboarded(page)
    await page.goto('/chat')
    await page.getByRole('button', { name: '楽しい' }).click()
    await expect(page).toHaveURL(/\/word/)
    await expect(page.locator('[data-testid="word-page"]')).toBeVisible()
    await expect(page.getByText('楽しい').first()).toBeVisible()
  })

  test('context panel close clears selection', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await seedOnboarded(page)
    await page.goto('/chat')
    await page.getByRole('button', { name: '楽しい' }).click()
    await expect(page.locator('[data-testid="context-panel"]')).toContainText('楽しい')
    await page
      .locator('[data-testid="context-panel"]')
      .getByRole('button', { name: 'Close word panel' })
      .click()
    await expect(page.locator('[data-testid="context-panel"]')).toContainText(
      /Select a word|単語を選んでください/i,
    )
  })
})
