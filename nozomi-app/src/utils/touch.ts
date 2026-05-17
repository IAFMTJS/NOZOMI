/** Shared classes for reliable taps on iOS / mobile browsers */
export const BTN_TOUCH =
  'touch-manipulation active:scale-[0.98] transition-transform disabled:active:scale-100'

export const BTN_ROW =
  `${BTN_TOUCH} min-h-[48px] w-full rounded-xl px-4 py-3`

export const BTN_ROW_SM =
  `${BTN_TOUCH} min-h-[36px] w-full rounded-lg px-3 py-1.5`

export const BTN_ICON =
  `${BTN_TOUCH} touch-target inline-flex items-center justify-center rounded-xl`

/** Futuristic form controls (see features/design/styles/sections/forms.css) */
export function formChipClass(active: boolean): string {
  return `form-chip ${BTN_TOUCH} ${active ? 'form-chip-active' : ''}`
}

export function formOptionClass(active: boolean, left = false): string {
  return `form-option ${BTN_TOUCH} ${left ? 'form-option-left' : ''} ${
    active ? 'form-option-active' : ''
  }`
}
