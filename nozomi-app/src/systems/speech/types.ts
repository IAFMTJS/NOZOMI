import type { SpeechState } from '@/types/domain'

export type SpeechErrorCode =
  | 'not-supported'
  | 'not-allowed'
  | 'no-device'
  | 'network'
  | 'busy'
  | 'start-failed'
  | 'unknown'

export type SpeechError = {
  code: SpeechErrorCode
  message: string
}

export type SpeechCallbacks = {
  onResult: (text: string) => void
  onInterim?: (text: string) => void
  onStateChange: (state: SpeechState) => void
  onLevel?: (level: number) => void
  onError?: (error: SpeechError) => void
}

export type StartListeningOptions = {
  /** BCP-47 tag, e.g. ja-JP or en-US */
  lang?: string
}
