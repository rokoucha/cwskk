import { MenuItem } from './types'

// 処理可能な特殊キー
export const ACCEPTABLE_SPECIAL_KEYS = ['Enter', 'Backspace']

export const CANDIDATE_LABEL = 'asdfjkl'

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
