import { describe, expect, test } from 'vitest'
import { ASCII_TABLE } from '../skk/rules/ascii'
import { ROMAJI_TABLE } from '../skk/rules/romaji'
import { parseKeys, type SubstitutionTable } from './parser'

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
  test('半角英数ならそのまま確定', () => {
    const actual = parseKeys(table, 'halfascii', 'abc')

    expect(actual).toStrictEqual({
      commit: 'abc',
      composition: '',
      mode: 'direct',
    })
  })

  test('全角英数ならそのまま確定', () => {
    const actual = parseKeys(table, 'wideascii', 'abc')

    expect(actual).toStrictEqual({
      commit: 'ａｂｃ',
      composition: '',
      mode: 'direct',
    })
  })
})

describe('かな', () => {
  test('変換が発生せずにそのまま確定', () => {
    const actual = parseKeys(table, 'hiragana', 'aiueo')

    expect(actual).toStrictEqual({
      commit: 'あいうえお',
      composition: '',
      mode: 'direct',
    })
  })

  test('変換が発生せずに確定、残余あり', () => {
    const actual = parseKeys(table, 'hiragana', 'aiueok')

    expect(actual).toStrictEqual({
      commit: 'あいうえお',
      composition: 'k',
      mode: 'direct',
    })
  })

  test('変換が発生', () => {
    const actual = parseKeys(table, 'hiragana', 'A')

    expect(actual).toStrictEqual({
      commit: '',
      composition: 'あ',
      mode: 'conversion',
    })
  })
})
