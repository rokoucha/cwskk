import type { AsciiTable, KanaTable, LetterMode } from '../types'
import { getKana } from './getKana'

export function keyToYomi({
  commit = false,
  keys,
  letterMode,
  table,
}: {
  commit: boolean
  keys: string
  letterMode: LetterMode
  table: { ascii: AsciiTable; kana: KanaTable }
}): { keys: string; yomi: string } {
  // 英数モード
  if (letterMode === 'halfascii' || letterMode === 'wideascii') {
    const rule = table.ascii.rule

    const letters = rule.find(([key]) => keys !== '' && key.startsWith(keys))

    if (letters) {
      const [half, wide] = letters

      return { keys: '', yomi: letterMode === 'halfascii' ? half : wide }
    } else {
      return { keys, yomi: '' }
    }
  }

  // かなモード
  const rule = table.kana.rule

  // 今後仮名になる可能性があるか?
  const matchable = rule.find(([key]) => keys !== '' && key.startsWith(keys))

  // 今のローマ字でマッチする読みの仮名
  const kana = rule.find(([key]) => key === keys)

  // 最短でマッチした仮名があるなら変換
  if (matchable && kana && matchable[0] === kana[0]) {
    const [_key, [hira, kata, han, flag]] = kana

    return {
      // leave-last な仮名なら最後のローマ字を残す
      keys: flag === 'leave-last' ? keys.slice(-1) : '',
      yomi: getKana(letterMode, hira, kata, han),
    }
  }

  // 確定する為に現時点で変換できる分を全て変換する
  if (matchable && commit) {
    const forceComitYomi = rule.find(
      ([key, [_hira, _kana, _han, _flag]]) => key === keys,
    )

    if (!forceComitYomi) {
      return {
        // もう確定するので leave-last は無視
        keys: '',
        yomi: '',
      }
    }

    const [_key, [hira, kata, han, _flag]] = forceComitYomi

    return {
      // もう確定するので leave-last は無視
      keys: '',
      yomi: getKana(letterMode, hira, kata, han),
    }
  }

  // 今後仮名にならないなら放棄
  if (!matchable) {
    let prekana = ''
    let willmatch = false

    do {
      prekana += keys.slice(0, 1)
      keys = keys.slice(1)

      // 頭にいる look-next なローマ字を変換
      const lookNext = rule.find(
        ([key, [_hira, _kana, _han, flag]]) =>
          key === prekana && flag === 'look-next',
      )
      if (lookNext) {
        const [_key, [hira, kata, han, _flag]] = lookNext

        return { keys, yomi: getKana(letterMode, hira, kata, han) }
      }

      // 余計な文字が前に入ったローマ字を変換
      const gleanings = rule.find(([key]) => key === keys)
      if (gleanings) {
        const [_key, [hira, kata, han, flag]] = gleanings

        return {
          // leave-last な仮名なら最後のローマ字を残す
          keys: flag === 'leave-last' ? keys.slice(-1) : '',
          yomi: getKana(letterMode, hira, kata, han),
        }
      }

      // 今後仮名になる可能性が生まれる状態までループ
      willmatch = rule.some(([key]) => key.startsWith(keys))
    } while (!willmatch && keys.length > 0)
  }

  return { keys, yomi: '' }
}
