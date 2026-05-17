import { NozomiOrb } from '@/components/orb/NozomiOrb'
import { LanguageText } from '@/components/language/LanguageText'

/** Visible splash while persisted profile/settings load (avoids blank black screen). */
export function BootScreen() {
  return (
    <div
      className="presence-screen flex flex-col items-center justify-center gap-6 bg-nozomi-bg px-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <NozomiOrb size={160} showPlatform />
      <LanguageText
        text={{
          jp: '読み込み中…',
          romaji: 'Yomikomi chuu…',
          en: 'Loading…',
        }}
        size="sm"
        align="center"
        passive
        hierarchy="presence"
      />
    </div>
  )
}
