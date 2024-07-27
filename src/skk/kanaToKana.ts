import runes from 'runes'
import { getKana } from './getKana'
import type { KanaLetterMode, KanaTable } from './types'

/**
 * かなを別のかなに変換
 *
 * @param params.table かな変換テーブル
 * @param params.text 変換する文字列
 * @param params.to 変換先の入力モード
 *
 * @returns 変換後の文字列
 */
export function kanaToKana({
  table,
  text,
  to,
}: {
  table: KanaTable
  text: string
  to: KanaLetterMode
}): string {
  const characters = runes(text)

  return characters
    .map((yomi) => {
      const rule = table.rule.find(([_key, [hira, kata, han]]) =>
        [hira, kata, han].includes(yomi),
      )
      const [_key, [hira, kata, han]] = rule ?? ['', ['', '', '']]

      return getKana(to, hira, kata, han)
    })
    .join('')
}
