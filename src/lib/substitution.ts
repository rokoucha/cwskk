export type SubstitutionAsciiMode = 'halfascii' | 'wideascii'

export type SubstitutionKanaMode = 'hiragana' | 'katakana' | 'halfkana'

export type SubstitutionMode = SubstitutionAsciiMode | SubstitutionKanaMode

/**
 * かなの変換ルール
 *
 * 特殊処理
 * - `leaveLast`: 替字しつつ最後の打鍵を次の替字の打鍵に残す。同じ子音が連続した時に「っ」する時に使う
 * - `lookNext`: 今の打鍵で替字できて次の打鍵で替字不能になる場合のみ替字する。次の打鍵でも替字できる可能性があるなら替字しない。「n」+別なローマ字を「ん」にする時に使う
 */
export type KanaRule = {
  key: string
  values: {
    hiragana: string
    katakana: string
    halfkana: string
  }
  special: {
    leaveLast: boolean
    lookNext: boolean
  }
}

/**
 * 英数の変換ルール
 */
export type AsciiRule = {
  key: string
  values: {
    half: string
    wide: string
  }
}

/**
 * 打鍵をかなに替字する
 */
export function keysToKana(
  rules: KanaRule[],
  mode: 'hiragana' | 'katakana' | 'halfkana',
  keys: string,
  commit: boolean,
): { keys: string; yomi: string } {
  const yomis: string[] = []

  let key = ''
  for (const [i, k] of keys.split('').entries()) {
    key += k

    const rule = rules.find((r) => r.key === key)

    // 替字不能なら次の打鍵を読む
    if (!rule) {
      continue
    }

    // 特殊処理チェック

    // leaveLast: 替字しつつ最後の打鍵を次の替字の打鍵に残す
    if (rule.special.leaveLast) {
      key = key.slice(-1)
      yomis.push(rule.values[mode])
      continue
    }

    // lookNext: 今の打鍵で替字できて次の打鍵で替字不能になる場合のみ替字する。次の打鍵でも替字できる可能性があるなら替字しない。
    if (rule.special.lookNext) {
      const next = keys.slice(i, i + 2)
      const nextRule = keys.length >= i + 2 && rules.some((r) => r.key === next)

      // 次の打鍵があって替字可能なら替字しない
      if (nextRule) {
        continue
      }

      // 今の打鍵で確定するなら替字
      if (commit) {
        key = ''
        yomis.push(rule.values[mode])
        continue
      }

      // 次の打鍵がないか替字不能なら今の打鍵で替字する
      key = ''
      yomis.push(rule.values[mode])
      continue
    }

    key = ''
    yomis.push(rule.values[mode])
  }

  // 今の打鍵で確定するなら残余をクリア
  if (commit) {
    key = ''
  }

  return {
    keys: key,
    yomi: yomis.join(''),
  }
}

/**
 * 打鍵を英数に替字する
 */
export function keysToAscii(
  rules: AsciiRule[],
  mode: 'halfascii' | 'wideascii',
  keys: string,
): string {
  const yomis: string[] = []

  for (const key of keys) {
    const rule = rules.find((r) => r.key === key)

    // 替字不能ならそのまま読みとする
    if (!rule) {
      yomis.push(key)
      continue
    }

    // 半角英数字を換字
    yomis.push(mode === 'halfascii' ? rule.values.half : rule.values.wide)
  }

  return yomis.join('')
}
