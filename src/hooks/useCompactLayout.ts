import { useSyncExternalStore } from 'react'

const compactLayout = matchMedia('(max-width: 720px)')
function subscribe(listener: () => void) {
  compactLayout.addEventListener('change', listener)
  return () => compactLayout.removeEventListener('change', listener)
}
export function useCompactLayout() {
  return useSyncExternalStore(subscribe, () => compactLayout.matches)
}
