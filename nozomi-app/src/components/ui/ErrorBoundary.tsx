import { Component, type ErrorInfo, type ReactNode } from 'react'
import { LanguageText } from '@/components/language/LanguageText'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nozomi error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="presence-screen app-page flex min-h-[var(--app-vh,100dvh)] items-center justify-center bg-nozomi-bg p-6"
          role="alert"
        >
          <div className="glass-panel p-6 max-w-md">
            <LanguageText
              text={{
                jp: '問題が発生しました',
                romaji: 'Mondai ga hassei shimashita',
                en: 'Something went wrong. Please refresh.',
              }}
              align="center"
            />
            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-white/15 py-3"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
            <button
              type="button"
              className="mt-2 w-full rounded-xl bg-nozomi-purple py-3"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

