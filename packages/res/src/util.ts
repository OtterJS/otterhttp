import mime from 'mime'

export type NormalizedType = {
  value: string | null
  quality?: number
  params: Record<string, string>
  originalIndex?: number
}

export const normalizeType = (type: string): NormalizedType => {
  if (type.indexOf('/') === -1) {
    return { value: mime.getType(type), params: {} }
  }

  return acceptParams(type)
}

export function acceptParams(str: string, index?: number): NormalizedType {
  const parts = str.split(/ *; */)
  const ret: NormalizedType = { value: parts[0], quality: 1, params: {}, originalIndex: index }

  for (const part of parts) {
    const pms = part.split(/ *= */)
    if ('q' === pms[0]) ret.quality = Number.parseFloat(pms[1])
    else ret.params[pms[0]] = pms[1]
  }

  return ret
}

export function normalizeTypes(types: string[]): NormalizedType[] {
  const ret: NormalizedType[] = []

  for (const type of types) {
    ret.push(normalizeType(type))
  }

  return ret
}
