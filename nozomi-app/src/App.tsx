import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { ChatPage } from '@/pages/ChatPage'
import { ListeningPage } from '@/pages/ListeningPage'
import { WordPage } from '@/pages/WordPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { SimulationDashboardPage } from '@/pages/SimulationDashboardPage'
import {
  ensureDataLoaded,
  ensureExtendedDataLoaded,
  ensureLexiconLoaded,
} from '@/database/importService'
import { ensureConversationTuningLoaded } from '@/systems/conversation/matching'
import { useUiStore } from '@/store/useUiStore'
import { AppShell } from '@/components/layout/AppShell'
import { OnboardingGuard } from '@/components/layout/OnboardingGuard'
import { FavoritesPage } from '@/pages/FavoritesPage'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { SpeechListenProvider } from '@/features/voice'
import { DevConnectBanner } from '@/components/dev/DevConnectBanner'
import { useInstallVisualViewportCss } from '@/hooks/useInstallVisualViewportCss'

export default function App() {
  const setDataReady = useUiStore((s) => s.setDataReady)
  const setDataLoadFailed = useUiStore((s) => s.setDataLoadFailed)
  useInstallVisualViewportCss()

  useEffect(() => {
    setDataLoadFailed(false)
    let lexiconIdle: number | undefined
    ensureDataLoaded()
      .then(() => ensureExtendedDataLoaded())
      .then(() => ensureConversationTuningLoaded())
      .then(() => {
        setDataReady(true)
        const loadLexicon = () => void ensureLexiconLoaded()
        if (typeof requestIdleCallback === 'function') {
          lexiconIdle = requestIdleCallback(loadLexicon, { timeout: 12_000 })
        } else {
          window.setTimeout(loadLexicon, 1500)
        }
      })
      .catch(() => {
        setDataLoadFailed(true)
        setDataReady(true)
      })
    return () => {
      if (lexiconIdle !== undefined && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(lexiconIdle)
      }
    }
  }, [setDataReady, setDataLoadFailed])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SpeechListenProvider>
          <div
            className="flex min-h-0 flex-col overflow-hidden"
            style={{
              height: 'var(--app-vh, 100dvh)',
              maxHeight: 'var(--app-vh, 100dvh)',
            }}
          >
            <DevConnectBanner />
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <AppShell>
                <OnboardingGuard>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/listen" element={<ListeningPage />} />
                    <Route path="/word" element={<WordPage />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    <Route path="/onboarding" element={<OnboardingPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/simulation" element={<SimulationDashboardPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </OnboardingGuard>
              </AppShell>
            </div>
          </div>
        </SpeechListenProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
