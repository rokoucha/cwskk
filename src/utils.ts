import runes from 'runes'

export const slice = (
  text: string,
  start?: number | undefined,
  end?: number | undefined,
): string => runes(text).slice(start, end).join('')
