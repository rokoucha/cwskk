import type { MenuItem } from './types'

/** 処理可能な特殊キー */
export const ACCEPTABLE_SPECIAL_KEYS = [
  'ArrowLeft',
  'ArrowRight',
  'Backspace',
  'Delete',
  'Enter',
  'Escape',
]

/** 候補選択に使用するキー */
export const CANDIDATE_LABEL = 'asdfjkl'

/** IME のメニュー要素 */
export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'skk-options',
    label: 'SKKの設定',
    style: 'check',
  },
  {
    id: 'skk-separator',
    style: 'separator',
  },
  {
    id: 'skk-halfascii',
    label: '英数',
    style: 'radio',
  },
  {
    id: 'skk-wideascii',
    label: '全角英数',
    style: 'radio',
  },
  {
    id: 'skk-hiragana',
    label: 'ひらがな',
    style: 'radio',
  },
  {
    id: 'skk-katakana',
    label: 'カタカナ',
    style: 'radio',
  },
  {
    id: 'skk-halfkana',
    label: '半角カタカナ',
    style: 'radio',
  },
]

/** 候補ウィンドウ表示までの猶予回数 */
export const CANDIDATE_WINDOW_OPEN_NUM = 3

/** 候補ウィンドウに表示する候補数 */
export const CANDIDATE_PAGE_SIZE = 7
