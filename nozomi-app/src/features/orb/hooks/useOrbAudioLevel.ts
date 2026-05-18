import { useSyncExternalStore } from 'react'
import {
  getOrbAudioLevel,
  subscribeOrbAudioLevel,
} from '@/features/orb/logic/orbAudioLevel'

export function useOrbAudioLevel(): number {
  return useSyncExternalStore(subscribeOrbAudioLevel, getOrbAudioLevel, () => 0)
}
