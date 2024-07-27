import { describe, expect, test } from 'vitest'
import { keyToAscii, keyToKana, keyToYomi } from './keyToYomi'
import { ASCII_TABLE } from './rules/ascii'
import { ROMAJI_TABLE } from './rules/romaji'

const table = { ascii: ASCII_TABLE, kana: ROMAJI_TABLE }

describe('keyToAscii', () => {
  test('空文字は何にもマッチしない', () => {
    const actual = keyToAscii({
      keys: '',
      table: ASCII_TABLE,
    })

    expect(actual).toBeUndefined()
  })

  test('マッチするルールがない', () => {
    const actual = keyToAscii({
      keys: 'あ',
      table: ASCII_TABLE,
    })

    expect(actual).toBeUndefined()
  })

  test('英数字にマッチ', () => {
    const actual = keyToAscii({
      keys: 'a',
      table: ASCII_TABLE,
    })

    expect(actual).toContain('a')
  })

  test('2文字以上はマッチしない', () => {
    const actual = keyToAscii({
      keys: 'backspace',
      table: ASCII_TABLE,
    })

    expect(actual).toBeUndefined()
  })
})

describe('keyToKana', () => {
  test('空文字は何にもマッチしない', () => {
    const actual = keyToKana({
      commit: false,
      keys: '',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBeUndefined()
  })

  test('何にもマッチしない', () => {
    const actual = keyToKana({
      commit: false,
      keys: 'q',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBeUndefined()
  })

  test('マッチ可能性ありだが強制確定のためマッチしない', () => {
    const actual = keyToKana({
      commit: true,
      keys: 'k',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBeUndefined()
  })

  test('1文字でマッチ', () => {
    const actual = keyToKana({
      commit: false,
      keys: 'a',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('')
    expect(actual.yomi).toContainEqual(expect.arrayContaining(['あ']))
  })

  test('2文字でマッチ可能性', () => {
    const actual = keyToKana({
      commit: false,
      keys: 'xt',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('xt')
    expect(actual.yomi).toBeUndefined()
  })

  test('2文字でマッチ', () => {
    const actual = keyToKana({
      commit: false,
      keys: 'ka',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('')
    expect(actual.yomi).toContainEqual(expect.arrayContaining(['か']))
  })

  test('3文字でマッチ可能性', () => {
    const actual = keyToKana({
      commit: false,
      keys: 'xts',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('xts')
    expect(actual.yomi).toBeUndefined()
  })

  test('3文字でマッチ', () => {
    const actual = keyToKana({
      commit: false,
      keys: 'nya',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('')
    expect(actual.yomi).toContainEqual(expect.arrayContaining(['にゃ']))
  })

  test('4文字でマッチ可能性', () => {
    const actual = keyToKana({
      commit: false,
      keys: 'xnts',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('xnts')
    expect(actual.yomi).toBeUndefined()
  })

  test('4文字でマッチ', () => {
    const actual = keyToKana({
      commit: false,
      keys: 'xtsu',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('')
    expect(actual.yomi).toContainEqual(expect.arrayContaining(['っ']))
  })

  test('5文字でマッチ', () => {
    const actual = keyToKana({
      commit: false,
      keys: 'xntsu',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('')
    expect(actual.yomi).toContainEqual(expect.arrayContaining(['ツ゚']))
  })

  test('通常モードで look-next にマッチしない', () => {
    const actual = keyToKana({
      commit: false,
      keys: 'n',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('n')
    expect(actual.yomi).toBeUndefined()
  })

  test('通常モードで look-next にマッチ', () => {
    const actual = keyToKana({
      commit: false,
      keys: 'nd',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('d')
    expect(actual.yomi).toContainEqual(expect.arrayContaining(['ん']))
  })

  test('強制確定モードで look-next にマッチ', () => {
    const actual = keyToKana({
      commit: true,
      keys: 'n',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('')
    expect(actual.yomi).toContainEqual(expect.arrayContaining(['ん']))
  })

  test('通常モードで leave-last にマッチ', () => {
    const actual = keyToKana({
      commit: false,
      keys: 'mb',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('b')
    expect(actual.yomi).toContainEqual(expect.arrayContaining(['ん']))
  })

  test('強制確定モードで leave-last にマッチ', () => {
    const actual = keyToKana({
      commit: true,
      keys: 'mb',
      table: ROMAJI_TABLE,
    })

    expect(actual.keys).toBe('')
    expect(actual.yomi).toContainEqual(expect.arrayContaining(['ん']))
  })
})

describe('keyToYomi', () => {
  test('半角英数に変換', () => {
    const actual = keyToYomi({
      keys: 'a',
      letterMode: 'halfascii',
      table,
    })

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('a')
  })

  test('全角英数に変換', () => {
    const actual = keyToYomi({
      keys: 'b',
      letterMode: 'wideascii',
      table,
    })

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('ｂ')
  })

  test('半角ｶﾅに変換', () => {
    const actual = keyToYomi({
      keys: 'a',
      letterMode: 'halfkana',
      table,
    })

    expect(actual.keys).toBe('')
    expect(actual.yomi).toBe('ｱ')
  })

  test('ひらがなに変換', () => {
    const actual = keyToYomi({
      keys: 'nd',
      letterMode: 'hiragana',
      table,
    })

    expect(actual.keys).toBe('d')
    expect(actual.yomi).toBe('ん')
  })

  test('カタカナに変換', () => {
    const actual = keyToYomi({
      keys: 'tt',
      letterMode: 'katakana',
      table,
    })

    expect(actual.keys).toBe('t')
    expect(actual.yomi).toBe('ッ')
  })
})
