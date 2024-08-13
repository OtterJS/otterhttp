function isWeak(etag: string) {
  return etag.startsWith('W/')
}

export function weakCompareETags(current: string, validator: string): boolean {
  const firstIsWeak = isWeak(current)
  const secondIsWeak = isWeak(validator)

  if (firstIsWeak && secondIsWeak) {
    return current.slice(2) === validator.slice(2)
  }

  if (firstIsWeak) {
    return current.slice(2) === validator
  }

  if (secondIsWeak) {
    return current === validator.slice(2)
  }

  return current === validator
}

export function strongCompareETags(current: string, validator: string): boolean {
  if (isWeak(current) || isWeak(validator)) return false
  return current === validator
}
