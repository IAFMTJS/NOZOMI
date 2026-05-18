import { test, expect } from '@playwright/test'
import { seedOnboardedForVoice } from './helpers'
import { installVoiceMocksInit, VOICE_MOCK_TRANSCRIPT } from './fixtures/voiceMocks'

test.describe('Voice listen turn', () => {
  test.setTimeout(60_000)

  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['microphone'])
    await page.addInitScript(installVoiceMocksInit, VOICE_MOCK_TRANSCRIPT, 'browser')
    await seedOnboardedForVoice(page)
  })

  test('listen → speak → engine reply → TTS completes', async ({ page }) => {
    await page.goto('/listen')
    await expect(page.getByTestId('listen-page')).toBeVisible({ timeout: 20_000 })

    const orb = page.getByTestId('listen-orb')
    await expect(orb).toBeVisible({ timeout: 15_000 })
    await expect(orb).toHaveAttribute('data-listen-phase', 'idle', { timeout: 25_000 })
    await orb.click()

    await expect(orb).toHaveAttribute('data-listen-phase', 'capturing', {
      timeout: 15_000,
    })

    await orb.click()

    await expect(page.getByTestId('voice-turn-panel')).toBeVisible({
      timeout: 25_000,
    })
    await expect(page.locator('.presence-float-user')).not.toHaveText(/^\s*$/, {
      timeout: 25_000,
    })
    await expect(page.locator('.presence-float-ai')).toBeVisible({
      timeout: 25_000,
    })

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const synth = window.speechSynthesis as SpeechSynthesis & {
              speaking?: boolean
            }
            return !synth.speaking
          }),
        { timeout: 15_000 },
      )
      .toBe(true)

    await expect(orb).toHaveAttribute('data-listen-phase', 'idle', { timeout: 20_000 })

    await orb.click()
    await expect(orb).toHaveAttribute('data-listen-phase', 'capturing', {
      timeout: 15_000,
    })
    await orb.click()

    await expect(page.locator('.presence-float-user')).toHaveCount(2, {
      timeout: 25_000,
    })
  })
})
