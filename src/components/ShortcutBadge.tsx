import { useShortcuts } from './EditorContext'
import { shortcutBadge, type ShortcutId } from '../shortcuts'

export function ShortcutBadge({ command, bindingIndex = 0, available = true }: { command: ShortcutId; bindingIndex?: number; available?: boolean }) {
  const { enabled } = useShortcuts()
  const label = shortcutBadge(command, bindingIndex)
  return enabled && available && label ? <kbd className="shortcut-badge" aria-hidden="true">{label}</kbd> : null
}
