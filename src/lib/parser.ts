import {
  type AsciiRule,
  type KanaRule,
  keysToAscii,
  keysToKana,
  SubstitutionKanaMode,
  SubstitutionMode,
} from './substitution'

/**
 * 替字テーブル
 */
export type SubstitutionTable = {
  kana: KanaRule[]
  ascii: AsciiRule[]
}

export type SKKMode =
  | 'direct'
  | 'conversion'
  | 'candidate-select'
  | 'completion'

export function parseKeys(
  rules: SubstitutionTable,
  mode: SubstitutionMode,
  keys: string,
): { commit: string; composition: string; mode: SKKMode } {
  switch (mode) {
    case 'hiragana':
    case 'katakana':
    case 'halfkana': {
      return parseKanaKeys(rules.kana, mode, keys)
    }
    case 'halfascii':
    case 'wideascii': {
      const res = keysToAscii(rules.ascii, mode, keys)
      return {
        commit: res,
        composition: '',
        mode: 'direct',
      }
    }
  }
}

function parseKanaKeys(
  rules: KanaRule[],
  mode: SubstitutionKanaMode,
  keys: string,
): { commit: string; composition: string; mode: SKKMode } {
  const res = keysToKana(rules, mode, keys, false)

  return {
    commit: res.yomi,
    composition: res.keys,
    mode: 'direct',
  }
}
