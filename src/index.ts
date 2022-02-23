import { download, Entries, parse } from './dictionary'
import { Rule } from 'types/rule'
import { ROMAJI_TABLE } from './rules/romaji'

type KanaMode = 'hiragana' | 'katakana' | 'halfkana'

let dict: Entries
;(async () => {
  dict = parse(
    await download('https://skk-dev.github.io/dict/SKK-JISYO.S.gz', 'euc-jp'),
  )
})()

let contextID: number
let conversion = false

let pending = ''
let committable = ''

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

function romajiToKana(table: Rule, mode: KanaMode, romaji: string) {
  let kana = ''

  // 今後仮名になる可能性があるか?
  const matchable = table.find(([key]) => key.startsWith(romaji))
  // 今のローマ字でマッチする読みの仮名
  const yomi = table.find(([key]) => key === romaji)

  // 最短でマッチした仮名があるなら変換
  if (matchable && yomi && matchable[0] === yomi[0]) {
    const [_key, [hira, kata, han, flag]] = yomi

    switch (mode) {
      case 'hiragana':
        kana += hira
        break
      case 'katakana':
        kana += kata
        break
      case 'halfkana':
        kana += han
        break
      default:
        const _: never = mode
    }

    // leave-last な仮名なら最後のローマ字を残す
    romaji = flag === 'leave-last' ? romaji.slice(-1) : ''
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

        switch (mode) {
          case 'hiragana':
            kana += hira
            break
          case 'katakana':
            kana += kata
            break
          case 'halfkana':
            kana += han
            break
          default:
            const _: never = mode
        }
      }

      // 余計な文字が前に入ったローマ字を変換
      const gleanings = ROMAJI_TABLE.find(([key]) => key === romaji)
      if (gleanings) {
        const [_key, [hira, kata, han, flag]] = gleanings

        switch (mode) {
          case 'hiragana':
            kana += hira
            break
          case 'katakana':
            kana += kata
            break
          case 'halfkana':
            kana += han
            break
          default:
            const _: never = mode
        }

        // leave-last な仮名なら最後のローマ字を残す
        romaji = flag === 'leave-last' ? romaji.slice(-1) : ''
      }

      // 今後仮名になる可能性が生まれる状態までループ
      willmatch = ROMAJI_TABLE.some(([key]) => key.startsWith(romaji))
    } while (!willmatch && romaji.length > 0)
  }

  return { romaji, kana }
}

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

  if (conversion && e.key === 'Enter') {
    conversion = false

    chrome.input.ime.clearComposition({ contextID })

    chrome.input.ime.commitText({ contextID, text: committable + pending })

    committable = ''
    pending = ''

    return true
  }

  if (conversion && e.key === ' ') {
    // かなを確定
    {
      const { romaji, kana } = romajiToKana(ROMAJI_TABLE, 'hiragana', pending)
      committable += kana
      pending = romaji
    }

    const candidates = dict.get(committable)
    if (!candidates || candidates.length === 0) {
      // TODO: 辞書登録処理
      alert('候補無し')

      return true
    }

    committable = candidates[0].candidate

    conversion = false

    chrome.input.ime.clearComposition({ contextID })

    chrome.input.ime.commitText({ contextID, text: committable + pending })

    committable = ''
    pending = ''

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

    chrome.input.ime.setComposition({
      contextID,
      text: composition,
      cursor: composition.length,
      selectionStart: 0,
      selectionEnd: composition.length,
    })
  } else {
    if (pending === '') {
      chrome.input.ime.clearComposition({ contextID })
    } else {
      const composition = pending

      chrome.input.ime.setComposition({
        contextID,
        text: composition,
        cursor: composition.length,
        selectionStart: 0,
        selectionEnd: composition.length,
      })
    }

    if (committable !== '') {
      chrome.input.ime.commitText({ contextID, text: committable })

      committable = ''
    }
  }

  return true
})

chrome.input.ime.onMenuItemActivated.addListener((_engineID, name) => {
  if (name === 'skk-options') {
    window.alert('option')
    return
  }

  window.alert(name)
})
