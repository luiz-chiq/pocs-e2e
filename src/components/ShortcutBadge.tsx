import { useShortcuts } from './EditorContext'

export function ShortcutBadge({ children, available = true }: { children: string; available?: boolean }) {
  const { enabled } = useShortcuts()
  return enabled && available ? <kbd className="shortcut-badge" aria-hidden="true">{children}</kbd> : null
}
