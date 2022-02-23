import { download, Entries, parse } from './dictionary'
import { Rule } from 'types/rule'
import { ROMAJI_TABLE } from './rules/romaji'
import {
  CandidateTemplate,
  clearComposition,
  commitText,
  onActive,
  onBlur,
  onFocus,
  onKeyEvent,
  onMenuItemActivated,
  setCandidates,
  setCandidateWindowProperties,
  setComposition,
  setMenuItems,
} from './chromeInputIme'

type KanaMode = 'hiragana' | 'katakana' | 'halfkana'

const LABEL = 'asdfjkl'

let dict: Entries
;(async () => {
  dict = parse(
    await download('https://skk-dev.github.io/dict/SKK-JISYO.S.gz', 'euc-jp'),
  )
})()

let contextID: number
let conversion = false
let engineID = 'cwskk'

let entries: CandidateTemplate[] = []

let pending = ''
let committable = ''

onActive.addListener(async (engineID) => {
  const items = [
    { id: 'skk-options', label: 'SKKの設定', style: 'check' },
    { id: 'skk-separator', style: 'separator' },
    { id: 'skk-hiragana', label: 'ひらがな', style: 'radio', checked: true },
    { id: 'skk-katakana', label: 'カタカナ', style: 'radio', checked: false },
  ]

  await setMenuItems({ engineID, items })
})

onFocus.addListener((ctx) => {
  contextID = ctx.contextID
})

onBlur.addListener((_ctx) => {
  contextID = -1
})

function getKana(mode: KanaMode, hira: string, kata: string, han: string) {
  switch (mode) {
    case 'hiragana':
      return hira
    case 'katakana':
      return kata
    case 'halfkana':
      return han
    default:
      const _: never = mode
  }
}

function romajiToKana(
  table: Rule,
  mode: KanaMode,
  romaji: string,
  commit = false,
) {
  let kana = ''

  // 今後仮名になる可能性があるか?
  const matchable = table.find(([key]) => key.startsWith(romaji))
  // 今のローマ字でマッチする読みの仮名
  const yomi = table.find(([key]) => key === romaji)

  // 最短でマッチした仮名があるなら変換
  if (matchable && yomi && matchable[0] === yomi[0]) {
    const [_key, [hira, kata, han, flag]] = yomi

    kana += getKana(mode, hira, kata, han)

    // leave-last な仮名なら最後のローマ字を残す
    romaji = flag === 'leave-last' ? romaji.slice(-1) : ''
  }
  // 確定する為に現時点で変換できる分を全て変換する
  else if (matchable && commit) {
    const lookNext = ROMAJI_TABLE.find(
      ([key, [_hira, _kana, _han, _flag]]) => key === romaji,
    )
    if (lookNext) {
      const [_key, [hira, kata, han, _flag]] = lookNext

      kana += getKana(mode, hira, kata, han)
    }

    // もう確定するので leave-last は無視
    romaji = ''
  }
  // 今後仮名にならないなら放棄
  else if (!matchable) {
    let prekana = ''
    let willmatch = false

    do {
      prekana += romaji.slice(0, 1)
      romaji = romaji.slice(1)

      // 頭にいる look-next なローマ字を変換
      const lookNext = ROMAJI_TABLE.find(
        ([key, [_hira, _kana, _han, flag]]) =>
          key === prekana && flag === 'look-next',
      )
      if (lookNext) {
        const [_key, [hira, kata, han, _flag]] = lookNext

        kana += getKana(mode, hira, kata, han)
      }

      // 余計な文字が前に入ったローマ字を変換
      const gleanings = ROMAJI_TABLE.find(([key]) => key === romaji)
      if (gleanings) {
        const [_key, [hira, kata, han, flag]] = gleanings

        kana += getKana(mode, hira, kata, han)

        // leave-last な仮名なら最後のローマ字を残す
        romaji = flag === 'leave-last' ? romaji.slice(-1) : ''
      }

      // 今後仮名になる可能性が生まれる状態までループ
      willmatch = ROMAJI_TABLE.some(([key]) => key.startsWith(romaji))
    } while (!willmatch && romaji.length > 0)
  }

  return { romaji, kana }
}

onKeyEvent.addListener(async (_engineID, e) => {
  if (e.type !== 'keydown') {
    return false
  }

  if (e.key.charCodeAt(0) === 0xfffd) {
    return false
  }

  if (e.ctrlKey && e.key == 'j') {
    return true
  }

  if (conversion && e.key === 'Enter') {
    conversion = false

    committable = entries.shift()?.candidate ?? committable

    await clearComposition({ contextID })

    await commitText({ contextID, text: committable + pending })

    await setCandidateWindowProperties({
      engineID: engineID,
      properties: {
        visible: false,
      },
    })

    entries = []

    committable = ''
    pending = ''

    return true
  }

  if (conversion && e.key === ' ') {
    // かなを確定
    {
      const { romaji, kana } = romajiToKana(
        ROMAJI_TABLE,
        'hiragana',
        pending,
        true,
      )
      committable += kana
      pending = romaji
    }

    const candidates = dict.get(committable)
    if (!candidates || candidates.length < 1) {
      await setCandidateWindowProperties({
        engineID: engineID,
        properties: {
          visible: false,
        },
      })

      entries = []
    } else {
      await setCandidateWindowProperties({
        engineID: engineID,
        properties: {
          visible: true,
          cursorVisible: false,
          vertical: true,
          pageSize: 7,
        },
      })

      entries = candidates.map((c, i) => ({
        annotation: c.annotation,
        candidate: c.candidate,
        id: i + 1,
        label: LABEL.charAt(i),
      }))

      await setCandidates({
        contextID,
        candidates: entries,
      })
    }

    return true
  }

  if (e.key.length > 1 || e.altKey || e.ctrlKey) {
    return false
  }

  if (!conversion && e.shiftKey) {
    // かなを確定
    {
      const { romaji, kana } = romajiToKana(ROMAJI_TABLE, 'hiragana', pending)
      committable += kana
      pending = romaji
    }

    conversion = true
  }

  pending += e.key.toLowerCase()

  // かなを確定
  {
    const { romaji, kana } = romajiToKana(ROMAJI_TABLE, 'hiragana', pending)
    committable += kana
    pending = romaji
  }

  if (conversion) {
    const composition = '▽' + committable + pending

    await setComposition({
      contextID,
      text: composition,
      cursor: composition.length,
      selectionStart: 0,
      selectionEnd: composition.length,
    })
  } else {
    if (pending === '') {
      await clearComposition({ contextID })
    } else {
      const composition = pending

      await setComposition({
        contextID,
        text: composition,
        cursor: composition.length,
        selectionStart: 0,
        selectionEnd: composition.length,
      })
    }

    if (committable !== '') {
      await commitText({ contextID, text: committable })

      committable = ''
    }
  }

  return true
})

onMenuItemActivated.addListener((_engineID, name) => {
  if (name === 'skk-options') {
    window.alert('option')
    return
  }

  window.alert(name)
})
