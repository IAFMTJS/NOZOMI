import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'
import { seedOnboarded, seedOnboardedForVoice } from './helpers'
import { installVoiceMocksInit, VOICE_MOCK_TRANSCRIPT } from './fixtures/voiceMocks'

type AxeViolation = { id: string; impact?: string; description: string }

function seriousViolations(violations: AxeViolation[]): AxeViolation[] {
  return violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
}

test.describe('Accessibility (axe)', () => {
  test('chat page has no serious WCAG violations', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await seedOnboarded(page)
    await page.goto('/chat')
    await expect(page.getByTestId('chat-page')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('log', { name: 'Chat messages' })).toBeVisible({
      timeout: 20_000,
    })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(seriousViolations(results.violations)).toEqual([])
  })

  test('listen page has no serious WCAG violations', async ({ page, context }) => {
    await context.grantPermissions(['microphone'])
    await page.addInitScript(installVoiceMocksInit, VOICE_MOCK_TRANSCRIPT, 'browser')
    await seedOnboardedForVoice(page)
    await page.goto('/listen')
    await expect(page.getByTestId('listen-page')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('listen-orb')).toBeVisible({ timeout: 15_000 })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(seriousViolations(results.violations)).toEqual([])
  })
})
