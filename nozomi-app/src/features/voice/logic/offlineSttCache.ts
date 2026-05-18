/** Browser Cache API helpers for Hugging Face / Whisper assets. */

function modelIdCacheTokens(modelId: string): string[] {
  const slash = modelId.includes('/') ? modelId : `Xenova/${modelId}`
  const dashed = slash.replace(/\//g, '--')
  return [slash, dashed, encodeURIComponent(slash)]
}

function urlMatchesModel(url: string, tokens: string[]): boolean {
  return tokens.some((t) => url.includes(t))
}

/** True when ONNX/config weights for this model appear in any HF-related cache. */
export async function hasCachedWhisperWeights(modelId: string): Promise<boolean> {
  if (typeof caches === 'undefined' || !modelId) return false
  const tokens = modelIdCacheTokens(modelId)
  try {
    const cacheNames = await caches.keys()
    for (const name of cacheNames) {
      if (!/transformers|onnx|whisper|hf-hub|huggingface/i.test(name)) continue
      const cache = await caches.open(name)
      const keys = await cache.keys()
      if (keys.some((req) => urlMatchesModel(req.url, tokens))) return true
    }
  } catch {
    return false
  }
  return false
}

export async function clearWhisperBrowserCaches(): Promise<number> {
  if (typeof caches === 'undefined') return 0
  const keys = await caches.keys()
  const targets = keys.filter((k) => /transformers|onnx|whisper|hf-hub|huggingface/i.test(k))
  await Promise.all(targets.map((k) => caches.delete(k)))
  return targets.length
}
