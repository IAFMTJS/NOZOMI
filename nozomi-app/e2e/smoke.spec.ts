import { test, expect } from '@playwright/test'
import { seedOnboarded } from './helpers'

test.describe('Nozomi smoke', () => {
  test('shows home directly when onboarding not complete in storage', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'nozomi-storage',
        JSON.stringify({
          state: {
            profile: {
              id: 'default',
              displayName: 'Learner',
              jlptLevel: 'N5',
              immersionLevel: 'beginner',
              personalityMode: 'calm',
              xp: 0,
              streakDays: 0,
              onboardingComplete: false,
            },
            settings: {
              showRomaji: true,
              showEnglish: true,
              voiceEnabled: true,
              voiceRate: 1,
              voicePitch: 1,
              orbIntensity: 1,
              reducedMotion: false,
              focusMode: false,
              suggestionCount: 3,
              staticOrb: false,
              favoriteVocabIds: [],
            },
          },
          version: 0,
        }),
      )
    })
    await page.goto('/')
    await expect(page).toHaveURL('/', { timeout: 15_000 })
    await expect(page.getByTestId('home-page')).toBeVisible({ timeout: 15_000 })
  })

  test('settings page loads after skipping onboarding via storage', async ({
    page,
  }) => {
    await seedOnboarded(page)
    await page.goto('/settings')
    await expect(page.getByRole('checkbox').first()).toBeVisible()
  })

  test('desktop sidebar visible on large viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await seedOnboarded(page)
    await page.goto('/')
    await expect(page.locator('aside nav a[href="/chat"]')).toBeVisible()
  })

  test('chat page shows story or messages when onboarded', async ({ page }) => {
    await seedOnboarded(page)
    await page.goto('/chat')
    await expect(page.getByRole('button', { name: '楽しい' })).toBeVisible({
      timeout: 15_000,
    })
  })
})
