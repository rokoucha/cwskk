import { describe, expect, test } from 'vitest'
import { ASCII_TABLE } from '../skk/rules/ascii'
import { ROMAJI_TABLE } from '../skk/rules/romaji'
import { AsciiRule, KanaRule, keysToAscii, keysToKana } from './substitution'

const asciiRule = ASCII_TABLE.rule.map(([half, wide]) => ({
  key: half,
  values: {
    half,
    wide,
  },
})) satisfies AsciiRule[]

const kanaRule = ROMAJI_TABLE.rule.map(
  ([key, [hiragana, katakana, halfkana, special]]) => ({
    key: key,
    values: {
      hiragana,
      katakana,
      halfkana,
    },
    special: {
      leaveLast: special === 'leave-last',
      lookNext: special === 'look-next',
    },
  }),
) satisfies KanaRule[]

describe('英数', () => {
  test('空文字は換字されない', () => {
    const actual = keysToAscii(asciiRule, 'halfascii', '')

    expect(actual).toBe('')
  })

  test('替字不能ならそのまま読みとする', () => {
    const actual = keysToAscii(asciiRule, 'halfascii', 'あ')

    expect(actual).toBe('あ')
  })

  test('半角英数字を換字', () => {
    const actual = keysToAscii(asciiRule, 'halfascii', 'a')

    expect(actual).toBe('a')
  })

  test('全角英数字を換字', () => {
    const actual = keysToAscii(asciiRule, 'wideascii', 'b')

    expect(actual).toBe('ｂ')
  })

  test('複数文字も換字できる', () => {
    const actual = keysToAscii(asciiRule, 'halfascii', 'a!b@')

    expect(actual).toBe('a!b@')
  })
})

describe('かな', () => {
  test('空文字は換字されない', () => {
    const actual = keysToKana(kanaRule, 'hiragana', '', false)

    expect(actual).toStrictEqual({
      keys: '',
      yomi: '',
    })
  })

  test('あてはまるルールがない', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'q', false)

    expect(actual).toStrictEqual({
      keys: 'q',
      yomi: '',
    })
  })

  test('後続の打鍵によっては替字できる可能性があるが、今の打鍵で確定なので替字されず棄却', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'k', true)

    expect(actual).toStrictEqual({
      keys: '',
      yomi: '',
    })
  })

  test('1文字で替字可能性', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'k', false)

    expect(actual).toStrictEqual({
      keys: 'k',
      yomi: '',
    })
  })

  test('1文字で替字', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'a', false)

    expect(actual).toStrictEqual({
      keys: '',
      yomi: 'あ',
    })
  })

  test('2文字で替字可能性', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'xt', false)

    expect(actual).toStrictEqual({
      keys: 'xt',
      yomi: '',
    })
  })

  test('2文字で替字', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'ka', false)

    expect(actual).toStrictEqual({
      keys: '',
      yomi: 'か',
    })
  })

  test('3文字で替字可能性', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'xts', false)

    expect(actual).toStrictEqual({
      keys: 'xts',
      yomi: '',
    })
  })

  test('3文字で替字', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'kya', false)

    expect(actual).toStrictEqual({
      keys: '',
      yomi: 'きゃ',
    })
  })

  test('4文字で替字可能性', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'xnts', false)

    expect(actual).toStrictEqual({
      keys: 'xnts',
      yomi: '',
    })
  })

  test('4文字で替字', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'xtsu', false)

    expect(actual).toStrictEqual({
      keys: '',
      yomi: 'っ',
    })
  })

  test('5文字で替字', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'xntsu', false)

    expect(actual).toStrictEqual({
      keys: '',
      yomi: 'ツ゚',
    })
  })

  test('lookNextの条件に一致しないので替字しない', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'na', false)

    expect(actual).toStrictEqual({
      keys: '',
      yomi: 'な',
    })
  })

  test('lookNextの条件に一致して替字', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'nd', false)

    expect(actual).toStrictEqual({
      keys: 'd',
      yomi: 'ん',
    })
  })

  test('lookNextの条件に一致しないが確定するので替字', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'n', true)

    expect(actual).toStrictEqual({
      keys: '',
      yomi: 'ん',
    })
  })

  test('leaveLastの条件に一致して替字', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'mb', false)

    expect(actual).toStrictEqual({
      keys: 'b',
      yomi: 'ん',
    })
  })

  test('leaveLastの条件に一致して替字し確定するので残余は棄却', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'mb', true)

    expect(actual).toStrictEqual({
      keys: '',
      yomi: 'ん',
    })
  })

  test('複数文字も換字できる', () => {
    const actual = keysToKana(
      kanaRule,
      'hiragana',
      'konnnitiwawwatasinonamaehatanakadesuy',
      false,
    )

    expect(actual).toStrictEqual({
      keys: 'y',
      yomi: 'こんにちわっわたしのなまえはたなかです',
    })
  })

  test('半角ｶﾅに変換', () => {
    const actual = keysToKana(kanaRule, 'halfkana', 'a', false)

    expect(actual).toStrictEqual({
      keys: '',
      yomi: 'ｱ',
    })
  })

  test('ひらがなに変換', () => {
    const actual = keysToKana(kanaRule, 'hiragana', 'a', false)

    expect(actual).toStrictEqual({
      keys: '',
      yomi: 'あ',
    })
  })

  test('カタカナに変換', () => {
    const actual = keysToKana(kanaRule, 'katakana', 'a', false)

    expect(actual).toStrictEqual({
      keys: '',
      yomi: 'ア',
    })
  })
})
