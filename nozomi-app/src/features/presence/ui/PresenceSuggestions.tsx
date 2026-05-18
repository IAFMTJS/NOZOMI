import { useEffect, useRef } from 'react'
import { LanguageText } from '@/components/language/LanguageText'
import { IconChatBubble } from '@/components/ui/Icons'
import type { Suggestion } from '@/types/domain'



interface Props {

  suggestions: Suggestion[]

  onSelect: (s: Suggestion) => void

  selectedKey?: string | null

}



export function PresenceSuggestions({

  suggestions,

  onSelect,

  selectedKey = null,

}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedKey || !scrollRef.current) return
    const selected = scrollRef.current.querySelector<HTMLElement>(
      '[aria-pressed="true"]',
    )
    selected?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [selectedKey, suggestions])

  if (!suggestions.length) return null



  return (

    <section className="presence-suggestions" aria-label="Suggestions">

      <div ref={scrollRef} className="presence-suggestion-scroll scrollbar-thin">

        {suggestions.map((s, i) => {

          const key = s.id ?? `${s.jp}-${i}`

          const selected = key === selectedKey

          return (

            <button

              key={key}

              type="button"

              onClick={() => onSelect(s)}

              aria-pressed={selected}

              className={`presence-suggestion-pill touch-manipulation${selected ? ' presence-suggestion-pill-selected' : ''}`}

            >

              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-nozomi-purple">

                <IconChatBubble size={12} />

              </span>

              <LanguageText text={s} size="sm" passive hierarchy="presence" />

            </button>

          )

        })}

      </div>

    </section>

  )

}

