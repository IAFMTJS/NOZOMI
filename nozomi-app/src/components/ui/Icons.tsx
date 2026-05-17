type IconProps = { className?: string; size?: number }

export function IconMenu({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconSliders({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 5v14M12 5v14M18 5v14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="6" cy="9" r="2" fill="currentColor" />
      <circle cx="12" cy="15" r="2" fill="currentColor" />
      <circle cx="18" cy="11" r="2" fill="currentColor" />
    </svg>
  )
}

export function IconBack({ size = 22, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconClose({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconMic({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6 11a6 6 0 0012 0M12 17v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconKeyboard({ size = 22, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M7 10h2M11 10h2M15 10h2M7 14h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconSuggestions({ size = 22, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 6h16M4 12h10M4 18h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M17 14l3 3-3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconSend({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 12l14-6-6 14-2-6-6-2z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}

export function IconStar({ size = 16, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
    </svg>
  )
}

export function IconChatBubble({ size = 18, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6 8a4 4 0 014-4h4a4 4 0 014 4v4a4 4 0 01-4 4h-2l-3 3v-3H10a4 4 0 01-4-4V8z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function IconSpeaker({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M11 6L6 10H4v4h2l5 4V6z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M16 9a3 3 0 010 6M19 6a6 6 0 010 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconStop({ size = 22, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  )
}

export function IconPractice({ size = 20, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function IconCheckRead({ className = '' }: { className?: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 12l4 4L25 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(-6)" opacity="0.7" />
    </svg>
  )
}
