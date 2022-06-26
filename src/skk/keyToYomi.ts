import type {
  AsciiRule,
  AsciiTable,
  KanaRule,
  KanaTable,
  LetterMode,
} from '../types'
import { getKana } from './getKana'

/**
 * 打鍵を読みに変換
 *
 * @param params.commit 現時点の入力で打ち切りにして読みを確定する
 * @param params.keys 打鍵
 * @param params.letterMode 入力モード
 * @param params.table 変換テーブル
 *
 * @returns 読みと残りの打鍵
 */
export function keyToYomi({
  commit = false,
  keys,
  letterMode,
  table,
}: {
  commit?: boolean | undefined
  keys: string
  letterMode: LetterMode
  table: { ascii: AsciiTable; kana: KanaTable }
}): { keys: string; yomi: string } {
  switch (letterMode) {
    case 'halfascii':
    case 'wideascii': {
      const [half, wide] = keyToAscii({ keys, table: table.ascii }) ?? ['', '']

      return {
        keys: '',
        yomi: letterMode === 'halfascii' ? half : wide,
      }
    }

    case 'halfkana':
    case 'hiragana':
    case 'katakana': {
      const {
        keys: remaining,
        yomi: [_key, [hira, kata, han]] = [, ['', '', '']],
      } = keyToKana({
        commit,
        keys,
        table: table.kana,
      })

      return {
        keys: remaining,
        yomi: getKana(letterMode, hira, kata, han),
      }
    }
  }
}

/**
 * 読みにマッチする英数変換ルールを検索
 *
 * @param params.keys 打鍵
 * @param params.table 英数変換テーブル
 *
 * @returns マッチした英数変換ルール
 */
export function keyToAscii({
  keys,
  table,
}: {
  keys: string
  table: AsciiTable
}): AsciiRule | undefined {
  const letters = table.rule.find(([key]) => key === keys)

  return letters
}

/**
 * 読みにマッチするかな変換ルールを検索
 *
 * @param params.commit 現時点の入力で打ち切りにして読みを確定する
 * @param params.keys 打鍵
 * @param params.table かな変換テーブル
 *
 * @returns マッチしたかな変換ルール
 */
export function keyToKana({
  commit,
  keys,
  table,
}: {
  commit: boolean
  keys: string
  table: KanaTable
}): { keys: string; yomi?: KanaRule | undefined } {
  const rule = table.rule

  // 今後かなになる可能性があるか?
  const matchable = rule.find(([key]) => keys !== '' && key.startsWith(keys))

  // 今の打鍵でマッチするかな
  const kana = rule.find(([key]) => key === keys)

  // 最短でマッチしたかながあるなら変換
  if (matchable && kana && matchable[0] === kana[0]) {
    const [_key, [_hira, _kata, _han, flag]] = kana

    return {
      // leave-last なかなで打ち切らないなら最後の打鍵を残す
      keys: flag === 'leave-last' && !commit ? keys.slice(-1) : '',
      yomi: kana,
    }
  }

  // 確定する為に現時点で変換できる分を全て変換する
  if (matchable && commit) {
    const forceComitYomi = rule.find(
      ([key, [_hira, _kana, _han, _flag]]) => key === keys,
    )

    return {
      // もう確定するので leave-last は無視
      keys: '',
      yomi: forceComitYomi,
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
        return {
          // 残りのローマ字を引き継ぐ
          keys,
          yomi: lookNext,
        }
      }

      // 余計な文字が前に入ったローマ字を変換
      const gleanings = rule.find(([key]) => key === keys)
      if (gleanings) {
        const [_key, [_hira, _kata, _han, flag]] = gleanings

        return {
          // leave-last な仮名なら最後のローマ字を残す
          keys: flag === 'leave-last' ? keys.slice(-1) : '',
          yomi: gleanings,
        }
      }

      // 今後仮名になる可能性が生まれる状態までループ
      willmatch = rule.some(([key]) => key.startsWith(keys))
    } while (!willmatch && keys.length > 0)
  }

  return { keys }
}
