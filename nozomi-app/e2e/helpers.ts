import type { Page } from '@playwright/test'

export const ONBOARDED_STORAGE = {
  state: {
    profile: {
      id: 'default',
      displayName: 'Learner',
      jlptLevel: 'N5',
      immersionLevel: 'beginner',
      personalityMode: 'calm',
      onboardingComplete: true,
    },
    settings: {
      showRomaji: true,
      showEnglish: true,
      voiceEnabled: false,
      voiceRate: 1,
      voicePitch: 1,
      orbIntensity: 1,
      reducedMotion: true,
      focusMode: false,
      suggestionCount: 3,
      staticOrb: true,
      favoriteVocabIds: [],
    },
    session: {
      activeIntent: 'free_chat',
      topicStack: ['daily'],
      turnCount: 0,
    },
    messages: [
      {
        id: 'e2e-n1',
        role: 'nozomi',
        text: {
          jp: '楽しい！元気？',
          romaji: 'Tanoshii! Genki?',
          en: 'Fun! How are you?',
        },
        timestamp: Date.now(),
      },
    ],
    contextBuffer: [
      { role: 'nozomi', content: '楽しい！元気？', topic: 'daily' },
    ],
  },
  version: 6,
}

export async function seedOnboarded(page: Page): Promise<void> {
  await page.addInitScript((payload) => {
    localStorage.setItem('nozomi-storage', JSON.stringify(payload))
  }, ONBOARDED_STORAGE)
}
