import type { LetterMode } from './types'

/**
 * 現在の入力モードから適切なかなを返す
 * 引っぱってきたルールをかなに変換するのに使う
 *
 * TODO: あとで良い感じの関数群として1ファイルに纏める
 *
 * @param mode 入力モード(かなのみ)
 * @param hiragana ひらがな
 * @param katakana カタカナ
 * @param halfkana 半角ｶﾅ
 * @returns
 */
export function getKana(
  mode: LetterMode,
  hiragana: string,
  katakana: string,
  halfkana: string,
): string {
  switch (mode) {
    case 'hiragana':
      return hiragana
    case 'katakana':
      return katakana
    case 'halfkana':
      return halfkana
    default:
      throw new Error('Called "getKana()" in ASCII input mode.')
  }
}
