import { ROMAJI_TABLE } from './rules/romaji'

let contextID: number
let conversion = false

let romaji = ''
let kana = ''
let kanji = ''
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

  composition = ''

  if (e.shiftKey) {
    composition = '▽'
    conversion = true
  }

  if (conversion && e.key === ' ') {
    return true
  }

  romaji += e.key.toLowerCase()

  const matchable = ROMAJI_TABLE.find(([key]) => key.startsWith(romaji))
  const yomi = ROMAJI_TABLE.find(([key]) => key === romaji)

  if (matchable && yomi && matchable[0] === yomi[0]) {
    const [_key, [hira, kata, han, flag]] = yomi

    kana = hira

    romaji = flag === 'leave-last' ? e.key.toLowerCase() : ''

    // chrome.input.ime.commitText({ contextID, text: commit })

    /* 
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
    */
  } else if (!matchable) {
    let willmatch = false

    do {
      const prekana = romaji.slice(0, 1)
      romaji = romaji.slice(1)

      const lookNext = ROMAJI_TABLE.find(
        ([key, [_hira, _kana, _han, flag]]) =>
          key === prekana && flag === 'look-next',
      )
      if (lookNext) {
        const [_key, [hira, kata, han, _flag]] = lookNext

        kana += hira
      }

      const gleanings = ROMAJI_TABLE.find(([key]) => key === romaji)
      if (gleanings) {
        const [_key, [hira, kata, han, flag]] = gleanings

        kana += hira

        romaji = flag === 'leave-last' ? e.key.toLowerCase() : ''
      }

      willmatch = ROMAJI_TABLE.some(([key]) => key.startsWith(romaji))
    } while (!willmatch && romaji.length > 0)

    // chrome.input.ime.commitText({ contextID, text: commit })
  }

  if (romaji === '') {
    chrome.input.ime.clearComposition({ contextID })

    composition = ''
  } else {
    composition += romaji

    chrome.input.ime.setComposition({
      contextID,
      text: composition,
      cursor: composition.length,
      selectionStart: 0,
      selectionEnd: composition.length,
    })
  }

  if (kana !== '') {
    chrome.input.ime.commitText({ contextID, text: kana })

    kana = ''
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
