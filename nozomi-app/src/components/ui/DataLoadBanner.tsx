import { useCallback, useState } from 'react'
import { LanguageText } from '@/components/language/LanguageText'
import {
  ensureDataLoaded,
  ensureExtendedDataLoaded,
  ensureLexiconLoaded,
} from '@/database/importService'
import { ensureConversationTuningLoaded } from '@/systems/conversation/matching'
import { useUiStore } from '@/store/useUiStore'
import { trackAppEvent } from '@/utils/appTelemetry'

/** Non-blocking warning when bundled conversation data failed to load. */
export function DataLoadBanner() {
  const dataLoadFailed = useUiStore((s) => s.dataLoadFailed)
  const setDataLoadFailed = useUiStore((s) => s.setDataLoadFailed)
  const setDataReady = useUiStore((s) => s.setDataReady)
  const [retrying, setRetrying] = useState(false)

  const retry = useCallback(async () => {
    setRetrying(true)
    setDataLoadFailed(false)
    try {
      await ensureDataLoaded()
      await ensureExtendedDataLoaded()
      await ensureConversationTuningLoaded()
      setDataReady(true)
      trackAppEvent('data_load_recovered')
      void ensureLexiconLoaded()
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      console.error('Nozomi data load retry failed:', err)
      trackAppEvent('data_load_retry_failed', detail)
      setDataLoadFailed(true)
    } finally {
      setRetrying(false)
    }
  }, [setDataLoadFailed, setDataReady])

  if (!dataLoadFailed) return null

  return (
    <div
      className="relative z-50 shrink-0 border-b border-amber-500/40 bg-nozomi-bg-elevated/95 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm"
      role="alert"
      aria-live="polite"
    >
      <LanguageText
        text={{
          jp: '会話データの読み込みに失敗しました',
          romaji: 'Kaiwa deeta no yomikomi ni shippai shimashita',
          en: 'Could not load conversation data. Replies may be limited until you retry.',
        }}
        size="sm"
        align="center"
      />
      <button
        type="button"
        disabled={retrying}
        onClick={() => void retry()}
        className="mt-2 w-full touch-manipulation rounded-lg border border-amber-500/50 py-2 text-sm text-nozomi-text hover:bg-nozomi-surface/60 disabled:opacity-50"
      >
        {retrying ? 'Retrying…' : 'Retry load'}
      </button>
    </div>
  )
}
