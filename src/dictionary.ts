import { inflate } from 'pako'

export type Encoding = 'utf-8' | 'euc-jp'

export type Key = string

export type Candidate = { candidate: string; annotation?: string }

export type Entries = Map<Key, Candidate[]>

export type Dictionary = {
  name: string
  url: string
  encoding: Encoding
  entries: Entries
}

export async function download(url: string, encoding: Encoding) {
  const res = await fetch(url)

  const decoder = new TextDecoder(encoding)

  let text: string
  if (res.headers.get('content-type') === 'application/gzip') {
    const inflated = inflate(new Uint8Array(await res.arrayBuffer()))

    text = decoder.decode(inflated)
  } else {
    text = decoder.decode(await res.arrayBuffer())
  }

  return text
}

export function parse(text: string) {
  const rawEntries = text.split('\n')

  const entries: Entries = new Map()

  for (const entry of rawEntries) {
    if (entry.startsWith(';;')) continue

    const splitter = entry.indexOf(' ')
    const key = entry.slice(0, splitter)
    const rawCandidates = entry.slice(splitter + 2, -1).split('/')

    const candidates: { candidate: string; annotation?: string }[] = []

    for (const rawCandidate of rawCandidates) {
      const [candidate, annotation] = rawCandidate.split(';') as [
        string,
        string | undefined,
      ]

      // TODO: S式のパース処理をここに書く

      candidates.push({ candidate, annotation })
    }

    entries.set(key, candidates)
  }

  return entries
}
