import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { lookupVocabBySurface } from '@/database/importService'
import { useNozomiStore } from '@/store/useNozomiStore'

const DESKTOP_QUERY = '(min-width: 1280px)'

export function useWordTap() {
  const navigate = useNavigate()
  const setActiveVocab = useNozomiStore((s) => s.setActiveVocab)

  return useCallback(
    async (surface: string) => {
      const entry = await lookupVocabBySurface(surface)
      if (!entry) return
      setActiveVocab(entry)
      if (!window.matchMedia(DESKTOP_QUERY).matches) {
        navigate('/word')
      }
    },
    [navigate, setActiveVocab],
  )
}
