import { Navigate, useLocation } from 'react-router-dom'
import { BootScreen } from '@/components/ui/BootScreen'
import { useStoreHydrated } from '@/hooks/useStoreHydrated'
import { useNozomiStore } from '@/store/useNozomiStore'

const ALLOWED = new Set(['/onboarding'])

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const hydrated = useStoreHydrated()
  const onboardingComplete = useNozomiStore((s) => s.profile.onboardingComplete)

  if (!hydrated) {
    if (pathname === '/onboarding') {
      return <>{children}</>
    }
    return <BootScreen />
  }

  if (!onboardingComplete && !ALLOWED.has(pathname)) {
    return <Navigate to="/onboarding" replace />
  }
  if (onboardingComplete && pathname === '/onboarding') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
