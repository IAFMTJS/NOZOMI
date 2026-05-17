import type { AppSettings, ImmersionLevel } from '@/types/domain'

export interface VisibilityFlags {
  showJapanese: boolean
  showRomaji: boolean
  showEnglish: boolean
  revealRomaji: boolean
  revealEnglish: boolean
  /** Advanced: both support layers behind one tap */
  revealSupport: boolean
  englishSubtle: boolean
}

export function getLanguageVisibility(
  level: ImmersionLevel,
  settings: AppSettings,
): VisibilityFlags {
  if (level === 'beginner') {
    return {
      showJapanese: true,
      showRomaji: settings.showRomaji,
      showEnglish: settings.showEnglish,
      revealRomaji: false,
      revealEnglish: false,
      revealSupport: false,
      englishSubtle: false,
    }
  }

  if (level === 'intermediate') {
    if (!settings.showEnglish) {
      return {
        showJapanese: true,
        showRomaji: settings.showRomaji,
        showEnglish: false,
        revealRomaji: false,
        revealEnglish: true,
        revealSupport: false,
        englishSubtle: false,
      }
    }
    return {
      showJapanese: true,
      showRomaji: settings.showRomaji,
      showEnglish: true,
      revealRomaji: false,
      revealEnglish: false,
      revealSupport: false,
      englishSubtle: true,
    }
  }

  if (!settings.showRomaji && !settings.showEnglish) {
    return {
      showJapanese: true,
      showRomaji: false,
      showEnglish: false,
      revealRomaji: false,
      revealEnglish: false,
      revealSupport: true,
      englishSubtle: false,
    }
  }

  return {
    showJapanese: true,
    showRomaji: settings.showRomaji,
    showEnglish: settings.showEnglish,
    revealRomaji: !settings.showRomaji,
    revealEnglish: !settings.showEnglish,
    revealSupport: false,
    englishSubtle: settings.showEnglish,
  }
}

export function normalizeLanguageText(
  text: Partial<{ jp: string; romaji: string; en: string }>,
): { jp: string; romaji: string; en: string } {
  return {
    jp: text.jp?.trim() || '…',
    romaji: text.romaji?.trim() || '',
    en: text.en?.trim() || '',
  }
}
