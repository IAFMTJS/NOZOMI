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
import { useUiStore } from '@/store/useUiStore'
import { AppShell } from '@/components/layout/AppShell'
import { OnboardingGuard } from '@/components/layout/OnboardingGuard'
import { FavoritesPage } from '@/pages/FavoritesPage'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { SpeechListenProvider } from '@/contexts/SpeechListenContext'
import { DevConnectBanner } from '@/components/dev/DevConnectBanner'

export default function App() {
  const setDataReady = useUiStore((s) => s.setDataReady)

  useEffect(() => {
    ensureDataLoaded()
      .then(() => ensureExtendedDataLoaded())
      .then(() => ensureLexiconLoaded())
      .then(() => ensureConversationTuningLoaded())
      .then(() => setDataReady(true))
      .catch(() => setDataReady(true))
  }, [setDataReady])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SpeechListenProvider>
          <div className="flex h-dvh max-h-dvh flex-col overflow-hidden">
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
