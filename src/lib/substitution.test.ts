import { describe, expect, test } from 'vitest'
import { ASCII_TABLE } from '../skk/rules/ascii'
import { ROMAJI_TABLE } from '../skk/rules/romaji'
import { keysToYomi, SubstitutionTable } from './substitution'

const table = {
  ascii: ASCII_TABLE.rule.map(([half, wide]) => ({
    key: half,
    values: {
      half,
      wide,
    },
  })),
  kana: ROMAJI_TABLE.rule.map(
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
  ),
} satisfies SubstitutionTable

describe('英数', () => {
  test('空文字は換字されない', () => {
    const actual = keysToYomi(table, 'halfascii', '', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('')
  })

  test('替字不能ならそのまま読みとする', () => {
    const actual = keysToYomi(table, 'halfascii', 'あ', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('あ')
  })

  test('半角英数字を換字', () => {
    const actual = keysToYomi(table, 'halfascii', 'a', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('a')
  })

  test('全角英数字を換字', () => {
    const actual = keysToYomi(table, 'wideascii', 'b', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('ｂ')
  })

  test('複数文字も換字できる', () => {
    const actual = keysToYomi(table, 'halfascii', 'a!b@', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('a!b@')
  })
})

describe('かな', () => {
  test('空文字は換字されない', () => {
    const actual = keysToYomi(table, 'hiragana', '', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('')
  })

  test('あてはまるルールがない', () => {
    const actual = keysToYomi(table, 'hiragana', 'q', false)

    expect(actual.keys).toBe('q')
    expect(actual.yomi).toBe('')
  })

  test('後続の打鍵によっては替字できる可能性があるが、今の打鍵で確定なので替字されず棄却', () => {
    const actual = keysToYomi(table, 'hiragana', 'k', true)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('')
  })

  test('1文字で替字可能性', () => {
    const actual = keysToYomi(table, 'hiragana', 'k', false)

    expect(actual.keys).toBe('k')
    expect(actual.yomi).toBe('')
  })

  test('1文字で替字', () => {
    const actual = keysToYomi(table, 'hiragana', 'a', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('あ')
  })

  test('2文字で替字可能性', () => {
    const actual = keysToYomi(table, 'hiragana', 'xt', false)

    expect(actual.keys).toBe('xt')
    expect(actual.yomi).toBe('')
  })

  test('2文字で替字', () => {
    const actual = keysToYomi(table, 'hiragana', 'ka', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('か')
  })

  test('3文字で替字可能性', () => {
    const actual = keysToYomi(table, 'hiragana', 'xts', false)

    expect(actual.keys).toBe('xts')
    expect(actual.yomi).toBe('')
  })

  test('3文字で替字', () => {
    const actual = keysToYomi(table, 'hiragana', 'kya', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('きゃ')
  })

  test('4文字で替字可能性', () => {
    const actual = keysToYomi(table, 'hiragana', 'xnts', false)

    expect(actual.keys).toBe('xnts')
    expect(actual.yomi).toBe('')
  })

  test('4文字で替字', () => {
    const actual = keysToYomi(table, 'hiragana', 'xtsu', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('っ')
  })

  test('5文字で替字', () => {
    const actual = keysToYomi(table, 'hiragana', 'xntsu', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('ツ゚')
  })

  test('lookNextの条件に一致しないので替字しない', () => {
    const actual = keysToYomi(table, 'hiragana', 'na', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('な')
  })

  test('lookNextの条件に一致して替字', () => {
    const actual = keysToYomi(table, 'hiragana', 'nd', false)

    expect(actual.keys).toBe('d')
    expect(actual.yomi).toBe('ん')
  })

  test('lookNextの条件に一致しないが確定するので替字', () => {
    const actual = keysToYomi(table, 'hiragana', 'n', true)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('ん')
  })

  test('leaveLastの条件に一致して替字', () => {
    const actual = keysToYomi(table, 'hiragana', 'mb', false)

    expect(actual.keys).toBe('b')
    expect(actual.yomi).toBe('ん')
  })

  test('leaveLastの条件に一致して替字し確定するので残余は棄却', () => {
    const actual = keysToYomi(table, 'hiragana', 'mb', true)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('ん')
  })

  test('複数文字も換字できる', () => {
    const actual = keysToYomi(
      table,
      'hiragana',
      'konnnitiwawwatasinonamaehatanakadesuy',
      false,
    )

    expect(actual.keys).toBe('y')
    expect(actual.yomi).toBe('こんにちわっわたしのなまえはたなかです')
  })
})

describe('モード', () => {
  test('半角英数に変換', () => {
    const actual = keysToYomi(table, 'halfascii', 'a', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('a')
  })

  test('全角英数に変換', () => {
    const actual = keysToYomi(table, 'wideascii', 'ｂ', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('ｂ')
  })

  test('半角ｶﾅに変換', () => {
    const actual = keysToYomi(table, 'halfkana', 'a', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('ｱ')
  })

  test('ひらがなに変換', () => {
    const actual = keysToYomi(table, 'hiragana', 'a', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('あ')
  })

  test('カタカナに変換', () => {
    const actual = keysToYomi(table, 'katakana', 'a', false)

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('ア')
  })
})
