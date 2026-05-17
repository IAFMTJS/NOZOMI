import { useSyncExternalStore } from 'react'
import {
  getOrbAudioLevel,
  subscribeOrbAudioLevel,
} from '@/systems/orb/orbAudioLevel'

export function useOrbAudioLevel(): number {
  return useSyncExternalStore(subscribeOrbAudioLevel, getOrbAudioLevel, () => 0)
}
