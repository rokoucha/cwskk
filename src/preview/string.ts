import runes from 'runes'

export const includes = (
  text: string,
  searchString: string,
  position?: number | undefined,
): boolean =>
  runes(text)
    .slice(position)
    .some((r) => r === searchString)

export const indexOf = (
  text: string,
  searchString: string,
  position?: number | undefined,
): number =>
  runes(text)
    .slice(position)
    .findIndex((r) => r === searchString)

export const slice = (
  text: string,
  start?: number | undefined,
  end?: number | undefined,
): string => runes(text).slice(start, end).join('')
