/**
 * ascii.ts
 * CorvusSKK の /imcrvcnf/convtable.cpp より改変、作成元ファイルは MIT License。
 * https://github.com/nathancorvussolis/corvusskk/blob/c8b835472614199afcef31f9e34e5b93c88273d6/imcrvcnf/convtable.cpp
 *
 * CorvusSKK
 *
 * The MIT License
 *
 * Copyright (C) 2011-2022 SASAKI Nobuyuki
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

import type { AsciiTable } from '../types'

export const ASCII_TABLE: AsciiTable = {
  rule: [
    [' ', '　'],
    ['!', '！'],
    ['"', '”'],
    ['#', '＃'],
    ['$', '＄'],
    ['%', '％'],
    ['&', '＆'],
    ["'", '’'],
    ['(', '（'],
    [')', '）'],
    ['*', '＊'],
    ['+', '＋'],
    [',', '，'],
    ['-', '－'],
    ['.', '．'],
    ['/', '／'],

    ['0', '０'],
    ['1', '１'],
    ['2', '２'],
    ['3', '３'],
    ['4', '４'],
    ['5', '５'],
    ['6', '６'],
    ['7', '７'],
    ['8', '８'],
    ['9', '９'],
    [':', '：'],
    [';', '；'],
    ['<', '＜'],
    ['=', '＝'],
    ['>', '＞'],
    ['?', '？'],

    ['@', '＠'],
    ['A', 'Ａ'],
    ['B', 'Ｂ'],
    ['C', 'Ｃ'],
    ['D', 'Ｄ'],
    ['E', 'Ｅ'],
    ['F', 'Ｆ'],
    ['G', 'Ｇ'],
    ['H', 'Ｈ'],
    ['I', 'Ｉ'],
    ['J', 'Ｊ'],
    ['K', 'Ｋ'],
    ['L', 'Ｌ'],
    ['M', 'Ｍ'],
    ['N', 'Ｎ'],
    ['O', 'Ｏ'],

    ['P', 'Ｐ'],
    ['Q', 'Ｑ'],
    ['R', 'Ｒ'],
    ['S', 'Ｓ'],
    ['T', 'Ｔ'],
    ['U', 'Ｕ'],
    ['V', 'Ｖ'],
    ['W', 'Ｗ'],
    ['X', 'Ｘ'],
    ['Y', 'Ｙ'],
    ['Z', 'Ｚ'],
    ['[', '［'],
    ['\\', '＼'],
    [']', '］'],
    ['^', '＾'],
    ['_', '＿'],

    ['`', '‘'],
    ['a', 'ａ'],
    ['b', 'ｂ'],
    ['c', 'ｃ'],
    ['d', 'ｄ'],
    ['e', 'ｅ'],
    ['f', 'ｆ'],
    ['g', 'ｇ'],
    ['h', 'ｈ'],
    ['i', 'ｉ'],
    ['j', 'ｊ'],
    ['k', 'ｋ'],
    ['l', 'ｌ'],
    ['m', 'ｍ'],
    ['n', 'ｎ'],
    ['o', 'ｏ'],

    ['p', 'ｐ'],
    ['q', 'ｑ'],
    ['r', 'ｒ'],
    ['s', 'ｓ'],
    ['t', 'ｔ'],
    ['u', 'ｕ'],
    ['v', 'ｖ'],
    ['w', 'ｗ'],
    ['x', 'ｘ'],
    ['y', 'ｙ'],
    ['z', 'ｚ'],
    ['{', '｛'],
    ['|', '｜'],
    ['}', '｝'],
    ['~', '～'],

    // ['', ''],
  ],
}
