import { describe, expect, test } from 'vitest'
import { kanaToKana } from '../kanaToKana'
import { ROMAJI_TABLE } from '../rules/romaji'

describe('kanaToKana', () => {
  test('to halfkana', () => {
    const actual = kanaToKana({
      table: ROMAJI_TABLE,
      text: 'ア',
      to: 'halfkana',
    })

    expect(actual).toBe('ｱ')
  })

  test('to hiragana', () => {
    const actual = kanaToKana({
      table: ROMAJI_TABLE,
      text: 'ｱ',
      to: 'hiragana',
    })

    expect(actual).toBe('あ')
  })

  test('to katakana', () => {
    const actual = kanaToKana({
      table: ROMAJI_TABLE,
      text: 'あ',
      to: 'katakana',
    })

    expect(actual).toBe('ア')
  })
})
