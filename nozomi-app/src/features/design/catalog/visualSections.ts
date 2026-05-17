/**
 * Visual & design map — one entry per UI domain.
 * CSS: `features/design/styles/sections/*.css` + `features/orb/styles/orb.css`.
 */

export type VisualSectionId =
  | 'tokens'
  | 'shell'
  | 'backdrop'
  | 'surfaces'
  | 'navigation'
  | 'chat'
  | 'suggestions'
  | 'typography'
  | 'presence'
  | 'orb'
  | 'voice'
  | 'language'
  | 'overlays'
  | 'settings'

export interface VisualSection {
  id: VisualSectionId
  title: string
  summary: string
  styles: string[]
  classPrefixes: string[]
  components: string[]
  pages: string[]
  feature?: string
}

export const VISUAL_SECTIONS: VisualSection[] = [
  {
    id: 'tokens',
    title: 'Design tokens',
    summary: 'Global palette, typography families, semantic colors (Tailwind @theme).',
    styles: [
      'src/features/design/styles/sections/tokens.css',
      'src/features/design/styles/sections/futuristic-core.css',
    ],
    classPrefixes: ['text-nozomi-', 'bg-nozomi-', 'border-nozomi-'],
    components: [],
    pages: ['*'],
    feature: 'design',
  },
  {
    id: 'shell',
    title: 'App shell',
    summary:
      'Page layout, scroll regions, touch targets, safe areas, reduced motion, mobile bottom nav.',
    styles: [
      'src/features/design/styles/sections/base.css',
      'src/features/design/styles/sections/shell-nav.css',
      'src/features/design/styles/sections/reduced-motion.css',
    ],
    classPrefixes: [
      'app-page',
      'app-header-btn',
      'touch-target',
      'safe-top',
      'safe-bottom',
      'mobile-bottom-nav',
      'font-display',
    ],
    components: [
      'components/layout/AppShell.tsx',
      'components/layout/FuturisticBackdrop.tsx',
      'components/layout/MobileBottomNav.tsx',
      'components/ui/AppHeader.tsx',
      'components/ui/BootScreen.tsx',
    ],
    pages: ['*'],
    feature: 'design',
  },
  {
    id: 'backdrop',
    title: 'Ambient backdrop',
    summary: 'Grid, vignette, scanlines, floating particles, radial glow.',
    styles: [
      'src/features/design/styles/sections/backdrop.css',
      'src/features/design/styles/sections/backdrop-motion.css',
    ],
    classPrefixes: ['futuristic-'],
    components: ['components/layout/FuturisticBackdrop.tsx'],
    pages: ['/', '/listen', '/chat', '/settings'],
    feature: 'design',
  },
  {
    id: 'surfaces',
    title: 'Glass & holo surfaces',
    summary: 'Panels, soft glass, purple/cyan glow utilities.',
    styles: ['src/features/design/styles/sections/surfaces.css'],
    classPrefixes: ['glass-panel', 'holo-panel', 'glow-'],
    components: [
      'features/voice/ui/MicPermissionBanner.tsx',
      'features/voice/ui/ListeningMicHint.tsx',
    ],
    pages: ['*'],
    feature: 'design',
  },
  {
    id: 'navigation',
    title: 'Navigation chrome',
    summary: 'Dock actions, mic FAB styling, spin borders.',
    styles: ['src/features/design/styles/sections/navigation.css'],
    classPrefixes: ['nav-action', 'nav-mic-btn'],
    components: [
      'features/presence/ui/PresenceDock.tsx',
      'features/voice/ui/MicButton.tsx',
    ],
    pages: ['/', '/listen', '/chat'],
    feature: 'presence',
  },
  {
    id: 'chat',
    title: 'Chat thread',
    summary: 'Compose bar, AI/user bubbles, chat page layout.',
    styles: ['src/features/design/styles/sections/chat.css'],
    classPrefixes: ['chat-compose', 'bubble-ai', 'bubble-user'],
    components: [
      'features/chat/ui/ChatInput.tsx',
      'features/chat/ui/MessageBubble.tsx',
    ],
    pages: ['/chat'],
    feature: 'chat',
  },
  {
    id: 'suggestions',
    title: 'Suggestions',
    summary: 'Scenario cards, compact pills, presence suggestion scroll.',
    styles: ['src/features/design/styles/sections/chat.css'],
    classPrefixes: [
      'suggestion-card',
      'suggestion-scroll',
      'presence-suggestion-',
    ],
    components: [
      'features/presence/ui/suggestions/SuggestionPills.tsx',
      'features/presence/ui/PresenceSuggestions.tsx',
      'components/scenarios/ScenarioPicker.tsx',
    ],
    pages: ['/', '/listen', '/chat'],
    feature: 'presence',
  },
  {
    id: 'typography',
    title: 'Japanese typography',
    summary: 'Tri-line hierarchy, holo shimmer, message JP/romaji/EN.',
    styles: [
      'src/features/design/styles/sections/typography.css',
      'src/features/design/styles/sections/typography-messages.css',
    ],
    classPrefixes: [
      'msg-jp',
      'msg-romaji',
      'msg-en',
      'text-holo',
      'font-jp',
      'section-label',
    ],
    components: [
      'components/language/LanguageText.tsx',
      'components/language/TriLineLabel.tsx',
      'components/language/FuriganaRuby.tsx',
      'components/language/TappableJapanese.tsx',
      'components/language/GrammarHint.tsx',
    ],
    pages: ['*'],
    feature: 'design',
  },
  {
    id: 'presence',
    title: 'Presence layout',
    summary:
      'Single-screen listen/home layout, status row, floats, dock, hints, story toggle.',
    styles: ['src/features/design/styles/sections/presence.css'],
    classPrefixes: [
      'presence-screen',
      'presence-stage',
      'presence-status',
      'presence-dock',
      'presence-float-',
      'float-bubble',
      'presence-hint',
      'presence-dimmed',
    ],
    components: [
      'features/presence/ui/PresenceStatusRow.tsx',
      'features/presence/ui/FloatingTurnBubbles.tsx',
      'features/presence/ui/PresenceDock.tsx',
      'features/presence/ui/PresenceSuggestions.tsx',
      'features/presence/ui/StoryModeToggle.tsx',
    ],
    pages: ['/', '/listen'],
    feature: 'presence',
  },
  {
    id: 'orb',
    title: 'Nozomi orb',
    summary:
      'Canvas aurora, static fallback, holo ring, platform, waveform, presence orb anchor.',
    styles: ['src/features/orb/styles/orb.css'],
    classPrefixes: ['orb-', 'presence-orb-'],
    components: [
      'features/orb/ui/NozomiOrb.tsx',
      'features/orb/ui/OrbCanvas.tsx',
      'features/orb/ui/StaticOrbVisual.tsx',
      'features/orb/ui/PresenceOrbShell.tsx',
      'features/orb/ui/WaveformStrip.tsx',
      'features/orb/ui/OrbAmbienceBridge.tsx',
    ],
    pages: ['/', '/listen', 'boot', '/onboarding'],
    feature: 'orb',
  },
  {
    id: 'voice',
    title: 'Voice & listen UI',
    summary:
      'Mic permission, live transcript, listen hints; defers orb/waveform visuals to orb section.',
    styles: ['src/features/design/styles/sections/voice.css'],
    classPrefixes: ['voice-live-transcript', 'voice-hint-panel'],
    components: [
      'features/voice/ui/LiveTranscript.tsx',
      'features/voice/ui/ListeningMicHint.tsx',
      'features/voice/ui/MicPermissionBanner.tsx',
      'features/voice/ui/NozomiVoicePicker.tsx',
    ],
    pages: ['/listen', '/settings'],
    feature: 'voice',
  },
  {
    id: 'language',
    title: 'Language learning UI',
    summary: 'Word detail, vocab cards (typography + glass surfaces).',
    styles: [],
    classPrefixes: ['tappable-jp'],
    components: ['components/vocab/WordDetailCard.tsx'],
    pages: ['/word', '/favorites'],
    feature: 'design',
  },
  {
    id: 'overlays',
    title: 'Overlays & sheets',
    summary: 'Chat history sheet, modal backdrops.',
    styles: ['src/features/design/styles/sections/overlays.css'],
    classPrefixes: ['history-sheet'],
    components: ['features/presence/ui/ChatHistorySheet.tsx'],
    pages: ['/listen'],
    feature: 'presence',
  },
  {
    id: 'settings',
    title: 'Settings & onboarding',
    summary: 'Forms, toggles, chips, primary CTA on glass panels.',
    styles: [
      'src/features/design/styles/sections/surfaces.css',
      'src/features/design/styles/sections/forms.css',
    ],
    classPrefixes: [
      'glass-panel',
      'form-input',
      'form-chip',
      'form-option',
      'form-toggle',
      'btn-primary',
      'settings-stack',
      'onboarding-step',
    ],
    components: [
      'pages/SettingsPage.tsx',
      'pages/OnboardingPage.tsx',
    ],
    pages: ['/settings', '/onboarding'],
    feature: 'design',
  },
]

export function getVisualSection(id: VisualSectionId): VisualSection | undefined {
  return VISUAL_SECTIONS.find((s) => s.id === id)
}

export function visualSectionsByFeature(feature: string): VisualSection[] {
  return VISUAL_SECTIONS.filter((s) => s.feature === feature)
}
