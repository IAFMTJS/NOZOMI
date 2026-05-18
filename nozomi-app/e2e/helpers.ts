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

/** Onboarded profile with voice-friendly defaults for listen e2e. */
export const ONBOARDED_VOICE_STORAGE = {
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
      speechInputLang: 'en-US',
      voiceEnabled: true,
      suggestionVoiceEnabled: false,
      voiceRate: 1,
      voicePitch: 1,
      voiceUri: 'auto',
      orbIntensity: 1,
      reducedMotion: true,
      focusMode: false,
      suggestionCount: 3,
      staticOrb: true,
      favoriteVocabIds: [],
      voiceStoryMode: false,
      listenEndMode: 'tap',
      voiceListenMode: 'push_to_talk',
      ttsProvider: 'browser',
      sttCloudProvider: 'builtin',
      whisperModel: 'tiny',
      cloudTtsApiKey: '',
      cloudSttApiKey: '',
      cloudLlmApiKey: '',
      labsWakeWord: false,
      labsCloudLlm: false,
      labsRealtimeS2s: false,
      labsTelephony: false,
      telephonyWebhookUrl: '',
    },
  },
  version: 9,
}

export async function seedOnboardedForVoice(page: Page): Promise<void> {
  await page.addInitScript((payload) => {
    localStorage.setItem('nozomi-storage', JSON.stringify(payload))
  }, ONBOARDED_VOICE_STORAGE)
}
