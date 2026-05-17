import { tokenizeJapanese, isJapaneseToken } from '@/utils/japaneseTokens'

interface Props {
  text: string
  className?: string
  onWordTap?: (surface: string) => void
}

export function TappableJapanese({ text, className = '', onWordTap }: Props) {
  if (!onWordTap) {
    return <p className={className}>{text}</p>
  }

  const tokens = tokenizeJapanese(text)

  return (
    <p className={className}>
      {tokens.map((token, i) =>
        isJapaneseToken(token) ? (
          <button
            key={`${i}-${token}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onWordTap(token)
            }}
            className="inline-block rounded px-1 py-2 -my-1 align-baseline underline decoration-dotted decoration-nozomi-purple/50 underline-offset-4 hover:bg-nozomi-purple/15 hover:text-nozomi-purple focus:outline-none focus-visible:ring-2 focus-visible:ring-nozomi-purple touch-manipulation"
          >
            {token}
          </button>
        ) : (
          <span key={`${i}-${token}`}>{token}</span>
        ),
      )}
    </p>
  )
}
