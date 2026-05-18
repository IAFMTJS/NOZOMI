import { Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { ChatPage } from '@/pages/ChatPage'
import { ListeningPage } from '@/pages/ListeningPage'
import {
  ensureDataLoaded,
  ensureExtendedDataLoaded,
} from '@/database/importService'
import { ensureConversationTuningLoaded } from '@/systems/conversation/matching'
import { useUiStore } from '@/store/useUiStore'
import { AppShell } from '@/components/layout/AppShell'
import { OnboardingGuard } from '@/components/layout/OnboardingGuard'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { SpeechListenProvider } from '@/features/voice'
import { DevConnectBanner } from '@/components/dev/DevConnectBanner'
import { DataLoadBanner } from '@/components/ui/DataLoadBanner'
import { BootScreen } from '@/components/ui/BootScreen'
import { useInstallVisualViewportCss } from '@/hooks/useInstallVisualViewportCss'
import { useDeferredPwaUpdate } from '@/hooks/useDeferredPwaUpdate'
import { useDeferredLexiconLoad } from '@/hooks/useDeferredLexiconLoad'
import { useDeferredWhisperPreload } from '@/hooks/useDeferredWhisperPreload'
import { lazyPage } from '@/routing/lazyPage'
import { trackAppEvent } from '@/utils/appTelemetry'

const WordPage = lazyPage(() => import('@/pages/WordPage'), 'WordPage')
const SettingsPage = lazyPage(() => import('@/pages/SettingsPage'), 'SettingsPage')
const FavoritesPage = lazyPage(() => import('@/pages/FavoritesPage'), 'FavoritesPage')
const OnboardingPage = lazyPage(
  () => import('@/pages/OnboardingPage'),
  'OnboardingPage',
)
const SimulationDashboardPage = lazyPage(
  () => import('@/pages/SimulationDashboardPage'),
  'SimulationDashboardPage',
)

function RouteFallback() {
  return <BootScreen />
}

function AppRoutes() {
  useDeferredLexiconLoad()
  useDeferredWhisperPreload()

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/listen" element={<ListeningPage />} />
      <Route
        path="/word"
        element={
          <Suspense fallback={<RouteFallback />}>
            <WordPage />
          </Suspense>
        }
      />
      <Route
        path="/favorites"
        element={
          <Suspense fallback={<RouteFallback />}>
            <FavoritesPage />
          </Suspense>
        }
      />
      <Route
        path="/onboarding"
        element={
          <Suspense fallback={<RouteFallback />}>
            <OnboardingPage />
          </Suspense>
        }
      />
      <Route
        path="/settings"
        element={
          <Suspense fallback={<RouteFallback />}>
            <SettingsPage />
          </Suspense>
        }
      />
      <Route
        path="/simulation"
        element={
          <Suspense fallback={<RouteFallback />}>
            <SimulationDashboardPage />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const setDataReady = useUiStore((s) => s.setDataReady)
  const setDataLoadFailed = useUiStore((s) => s.setDataLoadFailed)
  useInstallVisualViewportCss()
  useDeferredPwaUpdate()

  useEffect(() => {
    setDataLoadFailed(false)
    ensureDataLoaded()
      .then(() => ensureExtendedDataLoaded())
      .then(() => ensureConversationTuningLoaded())
      .then(() => setDataReady(true))
      .catch((err) => {
        const detail = err instanceof Error ? err.message : String(err)
        console.error('Nozomi data load failed:', err)
        trackAppEvent('data_load_failed', detail)
        setDataLoadFailed(true)
        setDataReady(true)
      })
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
            <DataLoadBanner />
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <AppShell>
                <OnboardingGuard>
                  <AppRoutes />
                </OnboardingGuard>
              </AppShell>
            </div>
          </div>
        </SpeechListenProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}