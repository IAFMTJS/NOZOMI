/** Split Japanese text into tappable word-like segments. */
export function tokenizeJapanese(text: string): string[] {
  const tokens: string[] = []
  const re =
    /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]+|[、。！？…\s]+|[^\s]+/gu
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    tokens.push(match[0])
  }
  return tokens.length ? tokens : [text]
}

export function isJapaneseToken(token: string): boolean {
  return /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(token)
}
