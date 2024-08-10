export const isString = (something: unknown): something is string => {
  return typeof something === 'string' || something instanceof String
}

export const isStringArray = (something: unknown): something is string[] => {
  if (typeof something !== 'object') return false
  if (!Array.isArray(something)) return false
  return something.every(isString)
}
