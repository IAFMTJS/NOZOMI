import { lazy, type ComponentType } from 'react'

/** Lazy-load a named page export for route-level code splitting. */
export function lazyPage<M extends Record<string, ComponentType<unknown>>>(
  loader: () => Promise<M>,
  exportName: keyof M & string,
) {
  return lazy(() =>
    loader().then((mod) => ({
      default: mod[exportName] as ComponentType<unknown>,
    })),
  )
}
