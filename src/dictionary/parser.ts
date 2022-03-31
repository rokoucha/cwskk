import { Candidate } from './index'

export async function parse(text: string) {
  const rawEntries = text.split('\n')

  const entries: [string, Candidate[]][] = []

  for (const entry of rawEntries) {
    if (entry.startsWith(';;')) continue

    const splitter = entry.indexOf(' ')
    const key = entry.slice(0, splitter)
    const rawCandidates = entry.slice(splitter + 2, -1).split('/')

    const candidates: Candidate[] = []

    for (const rawCandidate of rawCandidates) {
      const [candidate, annotation] = rawCandidate.split(';') as [
        string,
        string | undefined,
      ]

      // TODO: S式のパース処理をここに書く

      candidates.push({ candidate, annotation })
    }

    entries.push([key, candidates])
  }

  return entries
}
