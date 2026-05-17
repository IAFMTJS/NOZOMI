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
import { ensureConversationTuningLoaded } from '@/systems/conversation/conversationTuning'
import { useNozomiStore } from '@/store/useNozomiStore'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { SpeechListenProvider } from '@/contexts/SpeechListenContext'
import { DevConnectBanner } from '@/components/dev/DevConnectBanner'
import { useStoreHydrated } from '@/hooks/useStoreHydrated'

export default function App() {
  const storeHydrated = useStoreHydrated()
  const setDataReady = useNozomiStore((s) => s.setDataReady)

  useEffect(() => {
    ensureDataLoaded()
      .then(() => ensureExtendedDataLoaded())
      .then(() => ensureLexiconLoaded())
      .then(() => ensureConversationTuningLoaded())
      .then(() => setDataReady(true))
      .catch(() => setDataReady(true))
  }, [setDataReady])

  if (!storeHydrated) {
    return (
      <div
        className="flex h-dvh items-center justify-center bg-nozomi-bg"
        aria-busy="true"
        aria-label="Loading"
      />
    )
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SpeechListenProvider>
          <div className="flex h-dvh max-h-dvh flex-col overflow-hidden">
            <DevConnectBanner />
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <AppShell>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/listen" element={<ListeningPage />} />
                  <Route path="/word" element={<WordPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/simulation" element={<SimulationDashboardPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
            </div>
          </div>
        </SpeechListenProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
