/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
    | null
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
    | null
  onaudiostart?: ((this: SpeechRecognition, ev: Event) => void) | null
  onsoundstart?: ((this: SpeechRecognition, ev: Event) => void) | null
  onspeechstart?: ((this: SpeechRecognition, ev: Event) => void) | null
  onspeechend?: ((this: SpeechRecognition, ev: Event) => void) | null
  onnomatch?: ((this: SpeechRecognition, ev: Event) => void) | null
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition
  new (): SpeechRecognition
}
