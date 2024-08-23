export const isString = (something: unknown): something is string => {
  return typeof something === 'string' || something instanceof String
}

export const isNumber = (something: unknown): something is number => {
  return typeof something === 'number' || something instanceof Number
}

export const isIndexer = (something: unknown): something is string | number => {
  return isString(something) || isNumber(something)
}

export const isStringArray = (something: unknown): something is string[] => {
  if (typeof something !== 'object') return false
  if (!Array.isArray(something)) return false
  return something.every(isString)
}
