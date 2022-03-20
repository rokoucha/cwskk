import type { SKK } from './skk'

/**
 * かなの変換ルール
 *
 * `[よみ, [ひらがな, カタカナ, 半角ｶﾀｶﾅ, 特殊処理(省略可)]]`
 *
 * 特殊処理
 * - `leave-last`: 最後の文字をキーストロークに残す、同じ子音が連続した時に「っ」する時に使う
 * - `look-next`: 次の文字では変換不能になる場合のみ変換する、「n」+別なローマ字を「ん」にする時に使う
 */
export type KanaRule = [
  string,
  (
    | [string, string, string]
    | [string, string, string, 'leave-last' | 'look-next']
  ),
][]

/**
 * かなの変換テーブル
 *
 * - `convertible`: 変換開始が可能な文字(Shift-q のように変換開始しないキーを弾くために定義)
 * - `rule`: 変換ルール
 */
export type KanaTable = {
  convertible: string[]
  rule: KanaRule
}

/**
 * 英数の変換ルール
 *
 * `[半角, 全角]`
 */
export type AsciiRule = [string, string][]

/**
 * 英数の変換テーブル
 *
 * - `rule`: 変換ルール
 */
export type AsciiTable = {
  rule: AsciiRule
}

/** 入力モード */
export type LetterMode =
  | 'halfascii'
  | 'wideascii'
  | 'hiragana'
  | 'katakana'
  | 'halfkana'

/** 候補 */
export type CandidateTemplate = {
  candidate: string
  id: number
  parentId?: number
  label?: string
  annotation?: string
  usage?: {
    title: string
    body: string
  }
}

/** メニューの要素 */
export type MenuItem = {
  id: `skk-${LetterMode | 'options' | 'separator'}`
  label?: string
  style?: 'check' | 'radio' | 'separator'
  visible?: boolean
  checked?: boolean
  enabled?: boolean
}

/** SKK を動かすコンテナ */
export interface SKKContainer {}
/** SKK を動かすコンテナ */
export interface SKKContainerConstructor {
  new (skk: typeof SKK): SKKContainer
}

export type CandidateWindowProperties = {
  currentCandidateIndex?: number
  cursorVisible?: boolean
  pageSize?: number
  totalCandidates?: number
  vertical?: boolean
  visible?: boolean
}
