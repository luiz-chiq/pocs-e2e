export function normalizePolygonName(value: string) {
  return value.normalize('NFC').trim().replace(/ +/g, ' ')
}

export function isValidPolygonName(value: string) {
  const name = normalizePolygonName(value)
  return [...name].length > 0 && [...name].length <= 30 &&
    /^[\p{L}\p{N}][\p{L}\p{M}\p{N} ]*(?: \([1-9]\d*\))?$/u.test(name)
}

export function nextCloneName(source: string, existing: string[]) {
  const base = normalizePolygonName(source).replace(/ \([1-9]\d*\)$/u, '')
  const names = new Set(existing.map(normalizePolygonName))
  for (let number = 1; ; number++) {
    const suffix = ` (${number})`
    const name = [...base].slice(0, 30 - suffix.length).join('').trimEnd() + suffix
    if (!names.has(name)) return name
  }
}
