import { inflate } from 'pako'
import { ROMAJI_TABLE } from './rules/romaji'

async function fetchJisyo() {
  const res = await fetch('https://skk-dev.github.io/dict/SKK-JISYO.S.gz')

  const decoder = new TextDecoder('euc-jp')

  const inflated = inflate(new Uint8Array(await res.arrayBuffer()))

  const text = decoder.decode(inflated)

  const entries = text.split('\n')

  const dictionary = new Map<
    string,
    { candidate: string; annotation?: string }[]
  >()

  for (const entry of entries) {
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

    dictionary.set(key, candidates)
  }

  return dictionary
}

fetchJisyo().then((d) => console.log(d))

let contextID: number
let composition = ''

chrome.input.ime.onActivate.addListener((engineID) => {
  const items = [
    { id: 'skk-options', label: 'SKKの設定', style: 'check' },
    { id: 'skk-separator', style: 'separator' },
    { id: 'skk-hiragana', label: 'ひらがな', style: 'radio', checked: true },
    { id: 'skk-katakana', label: 'カタカナ', style: 'radio', checked: false },
  ]

  chrome.input.ime.setMenuItems({ engineID, items })
})

chrome.input.ime.onFocus.addListener((ctx) => {
  contextID = ctx.contextID
})

chrome.input.ime.onBlur.addListener((_ctx) => {
  contextID = -1
})

chrome.input.ime.onKeyEvent.addListener((_engineID, e) => {
  if (e.type !== 'keydown') {
    return false
  }

  if (e.key.charCodeAt(0) === 0xfffd) {
    return false
  }

  if (e.ctrlKey && e.key == 'j') {
    return true
  }

  if (e.key.length > 1 || e.altKey || e.ctrlKey) {
    return false
  }

  composition += e.key

  const matchable = ROMAJI_TABLE.find(([key]) => key.startsWith(composition))
  const yomi = ROMAJI_TABLE.find(([key]) => key === composition)

  if (matchable && yomi && matchable[0] === yomi[0]) {
    const [_key, [hira, kata, han, flag]] = yomi

    const commit = hira

    composition = flag === 'leave-last' ? e.key : ''

    chrome.input.ime.commitText({ contextID, text: commit })

    if (flag === 'leave-last') {
      chrome.input.ime.setComposition({
        contextID,
        text: composition,
        cursor: composition.length,
        selectionStart: 0,
        selectionEnd: composition.length,
      })
    } else {
      chrome.input.ime.clearComposition({ contextID })
    }

    return true
  }

  if (!matchable) {
    let commit = ''
    let willmatch = false

    do {
      commit += composition.slice(0, 1)
      composition = composition.slice(1)

      const lookNext = ROMAJI_TABLE.find(
        ([key, [_hira, _kana, _han, flag]]) =>
          key === commit && flag === 'look-next',
      )
      if (lookNext) {
        const [_key, [hira, kata, han, _flag]] = lookNext

        commit = hira
      }

      const gleanings = ROMAJI_TABLE.find(([key]) => key === composition)
      if (gleanings) {
        const [_key, [hira, kata, han, _flag]] = gleanings

        commit = hira
        composition = ''
      }

      willmatch = ROMAJI_TABLE.some(([key]) => key.startsWith(composition))
    } while (!willmatch && composition.length > 0)

    chrome.input.ime.commitText({ contextID, text: commit })
  }

  chrome.input.ime.setComposition({
    contextID,
    text: composition,
    cursor: composition.length,
    selectionStart: 0,
    selectionEnd: composition.length,
  })

  return true
})

chrome.input.ime.onMenuItemActivated.addListener((_engineID, name) => {
  if (name === 'skk-options') {
    window.alert('option')
    return
  }

  window.alert(name)
})
