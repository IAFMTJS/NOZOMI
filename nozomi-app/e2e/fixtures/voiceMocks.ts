/** Installs browser SpeechRecognition + speechSynthesis mocks for voice e2e. */
export const VOICE_MOCK_TRANSCRIPT = 'hello'

export function installVoiceMocksInit(
  transcript: string,
  sttEngine: 'browser' | 'local',
): void {
  ;(window as Window & { __NOZOMI_E2E__?: boolean }).__NOZOMI_E2E__ = true
  try {
    localStorage.setItem('nozomi.sttEngine', sttEngine)
  } catch {
    /* ignore */
  }

  class MockSpeechRecognition {
    continuous = true
    interimResults = true
    maxAlternatives = 1
    lang = 'en-US'
    onaudiostart: (() => void) | null = null
    onsoundstart: (() => void) | null = null
    onspeechstart: (() => void) | null = null
    onspeechend: (() => void) | null = null
    onresult: ((ev: SpeechRecognitionEvent) => void) | null = null
    onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null = null
    onend: (() => void) | null = null
    onstart: (() => void) | null = null

    start() {
      window.setTimeout(() => this.onstart?.(), 15)
      const emit = (isFinal: boolean, text: string) => {
        const result = {
          isFinal,
          length: 1,
          0: { transcript: text, confidence: 0.99 },
          item: (i: number) => (i === 0 ? { transcript: text, confidence: 0.99 } : undefined),
        }
        const results = {
          length: 1,
          0: result,
          item: (i: number) => (i === 0 ? result : undefined),
        }
        this.onresult?.({ results, resultIndex: 0 } as SpeechRecognitionEvent)
      }
      window.setTimeout(() => this.onaudiostart?.(), 20)
      window.setTimeout(() => this.onsoundstart?.(), 30)
      window.setTimeout(() => this.onspeechstart?.(), 40)
      window.setTimeout(() => emit(false, transcript), 80)
    }

    stop() {
      const emit = (isFinal: boolean, text: string) => {
        const result = {
          isFinal,
          length: 1,
          0: { transcript: text, confidence: 0.99 },
          item: (i: number) => (i === 0 ? { transcript: text, confidence: 0.99 } : undefined),
        }
        const results = {
          length: 1,
          0: result,
          item: (i: number) => (i === 0 ? result : undefined),
        }
        this.onresult?.({ results, resultIndex: 0 } as SpeechRecognitionEvent)
      }
      window.setTimeout(() => {
        emit(true, transcript)
        this.onspeechend?.()
        this.onend?.()
      }, 40)
    }

    abort() {
      window.setTimeout(() => this.onend?.(), 0)
    }
  }

  const w = window as Window & {
    SpeechRecognition?: typeof SpeechRecognition
    webkitSpeechRecognition?: typeof SpeechRecognition
  }
  w.SpeechRecognition = MockSpeechRecognition as unknown as typeof SpeechRecognition
  w.webkitSpeechRecognition = MockSpeechRecognition as unknown as typeof SpeechRecognition

  if (!navigator.mediaDevices) {
    ;(navigator as Navigator & { mediaDevices: MediaDevices }).mediaDevices =
      {} as MediaDevices
  }
  navigator.mediaDevices.getUserMedia = async () => {
    const ctx = new AudioContext()
    return ctx.createMediaStreamDestination().stream
  }

  const mockSynth = {
    pending: false,
    speaking: false,
    paused: false,
    onvoiceschanged: null as (() => void) | null,
    getVoices: () => [] as SpeechSynthesisVoice[],
    speak(u: SpeechSynthesisUtterance) {
      mockSynth.pending = true
      mockSynth.speaking = true
      u.onstart?.({} as SpeechSynthesisEvent)
      window.setTimeout(() => {
        mockSynth.pending = false
        mockSynth.speaking = false
        u.onend?.({} as SpeechSynthesisEvent)
      }, 60)
    },
    cancel() {
      mockSynth.pending = false
      mockSynth.speaking = false
    },
    pause() {
      mockSynth.paused = true
    },
    resume() {
      mockSynth.paused = false
    },
    addEventListener(type: string, fn: () => void) {
      if (type === 'voiceschanged') mockSynth.onvoiceschanged = fn
    },
    removeEventListener() {
      /* noop */
    },
  }
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: mockSynth,
  })
}
