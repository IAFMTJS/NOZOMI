import { LanguageText } from '@/components/language/LanguageText'
import { FuriganaRuby } from '@/components/language/FuriganaRuby'
import { IconPractice, IconSpeaker, IconStar } from '@/components/ui/Icons'
import { UI_LABELS } from '@/data/ui-labels'
import { useNozomiStore } from '@/store/useNozomiStore'
import type { VocabEntry } from '@/types/domain'
import { speakJapanese } from '@/features/voice'
import { BTN_ICON, BTN_ROW } from '@/utils/touch'

interface Props {
  word: VocabEntry
  related?: VocabEntry[]
  compact?: boolean
  onSelectRelated?: (entry: VocabEntry) => void
  onPractice?: () => void
}

function RelatedWordRow({
  entry,
  onSelect,
}: {
  entry: VocabEntry
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${BTN_ROW} glass-panel-soft flex items-center justify-between gap-2 text-left hover:border-nozomi-border-strong touch-manipulation`}
    >
      <LanguageText text={entry} size="sm" passive />
      <span className="text-nozomi-purple" aria-hidden>
        →
      </span>
    </button>
  )
}

export function WordDetailCard({
  word,
  related = [],
  compact = false,
  onSelectRelated,
  onPractice,
}: Props) {
  const settings = useNozomiStore((s) => s.settings)
  const toggleFavorite = useNozomiStore((s) => s.toggleFavoriteVocab)
  const isFavorite = settings.favoriteVocabIds?.includes(word.id) ?? false

  const speak = (jp: string) => {
    if (settings.voiceEnabled) {
      speakJapanese(jp, {
        rate: settings.voiceRate,
        pitch: settings.voicePitch,
        voiceUri: settings.voiceUri,
      })
    }
  }

  const entryLabel =
    word.entryType === 'particle'
      ? 'Particle'
      : word.entryType === 'verb'
        ? 'Verb'
        : word.category

  return (
    <article className={`glass-panel glow-purple-sm ${compact ? 'p-4' : 'p-6'}`}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <span className="section-label">{entryLabel}</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => toggleFavorite(word.id)}
            className={`${BTN_ICON} h-11 w-11 rounded-lg transition ${
              isFavorite ? 'text-yellow-400' : 'text-nozomi-muted hover:text-yellow-400/80'
            }`}
            aria-label={isFavorite ? UI_LABELS.unfavorite.en : UI_LABELS.favorite.en}
          >
            <IconStar size={18} />
          </button>
          <button
            type="button"
            onClick={() => speak(word.jp)}
            className={`${BTN_ICON} h-11 w-11 rounded-lg text-nozomi-purple hover:bg-nozomi-signal/15`}
            aria-label="Play pronunciation"
          >
            <IconSpeaker size={18} />
          </button>
        </div>
      </div>
      <p
        className={`font-semibold text-nozomi-text leading-snug ${
          compact ? 'text-2xl' : 'text-3xl md:text-4xl'
        }`}
      >
        <FuriganaRuby
          kanji={word.kanji ?? word.jp}
          reading={word.hiragana || word.romaji}
        />
      </p>
      <LanguageText
        text={{ jp: '', romaji: word.romaji, en: word.en }}
        size="sm"
      />

      {word.exampleJp && (
        <section className="mt-5">
          <p className="section-label mb-2">{UI_LABELS.exampleSentence.en}</p>
          <div className="glass-panel-soft flex items-start justify-between gap-3 p-4">
            <LanguageText
              text={{
                jp: word.exampleJp,
                romaji: word.exampleRomaji ?? '',
                en: word.exampleEn ?? '',
              }}
              size="sm"
            />
            <button
              type="button"
              onClick={() => speak(word.exampleJp!)}
              className={`${BTN_ICON} h-11 w-11 shrink-0 text-nozomi-purple`}
              aria-label="Play example"
            >
              <IconSpeaker size={18} />
            </button>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-5">
          <p className="section-label mb-2">{UI_LABELS.relatedWords.en}</p>
          <div className="space-y-2">
            {related.map((r) => (
              <RelatedWordRow
                key={r.id}
                entry={r}
                onSelect={() => onSelectRelated?.(r)}
              />
            ))}
          </div>
        </section>
      )}

      {onPractice && !compact && (
        <button
          type="button"
          onClick={onPractice}
          className={`${BTN_ROW} mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-nozomi-signal text-[#08080c] font-bold uppercase tracking-wider shadow-[0_4px_0_0_#9d0208] glow-purple-sm`}
        >
          <IconPractice className="pointer-events-none text-white" />
          <LanguageText text={UI_LABELS.practiceWord} align="center" size="sm" passive />
        </button>
      )}
    </article>
  )
}
