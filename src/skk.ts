import { download, parse, Entries } from './dictionary'
import { ROMAJI_TABLE } from './rules/romaji'
import { CANDIDATE_LABEL } from './constants'
import type { CandidateTemplate, KanaMode, MenuItem, Rule } from './types'

export type SKKIMEMethods = {
  clearComposition(): Promise<void>
  commitText(text: string): Promise<void>
  setCandidates(candidates: CandidateTemplate[]): Promise<void>
  setCandidateWindowProperties(properties: {
    cursorVisible?: boolean
    pageSize?: number
    vertical?: boolean
    visible?: boolean
  }): Promise<void>
  setComposition(
    text: string,
    cursor: number,
    properties?: {
      selectionStart?: number | undefined
      selectionEnd?: number | undefined
    },
  ): Promise<void>
  setMenuItems(items: MenuItem[]): Promise<void>
}

export class SKK {
  private committable: string
  private conversion: boolean
  private entries: CandidateTemplate[]
  private pending: string
  private dict: Entries
  private ime: SKKIMEMethods
  private rule: Rule

  constructor(ime: SKKIMEMethods) {
    this.committable = ''
    this.conversion = false
    this.dict = new Map()
    this.entries = []
    this.pending = ''
    this.rule = ROMAJI_TABLE

    this.ime = ime
  }

  public async setup() {
    await this.getDict()
    await this.setMenuItems()
  }

  public async onCandidateSelected(index: number) {
    this.conversion = false

    this.committable = this.entries[index].candidate ?? this.committable

    await this.ime.clearComposition()

    await this.ime.commitText(this.committable + this.pending)

    await this.ime.setCandidateWindowProperties({
      visible: false,
    })

    this.entries = []

    this.committable = ''
    this.pending = ''

    return true
  }

  public async onKeyEvent(e: KeyboardEvent) {
    if (e.type !== 'keydown') {
      return false
    }

    if (e.key.charCodeAt(0) === 0xfffd) {
      return false
    }

    // FIXME: 処理するキーかどうかちゃんとチェックする
    if (e.key.length > 5 || e.altKey || e.ctrlKey) {
      return false
    }

    if (e.ctrlKey && e.key == 'j') {
      return true
    }

    // Shift が押されたら現時点のかなを確定して変換モードにする
    if (!this.conversion && e.shiftKey) {
      // かなを確定
      {
        const { romaji, kana } = this.romajiToKana('hiragana', this.pending)
        this.committable += kana
        this.pending = romaji
      }

      this.conversion = true
    }

    // 特殊キー以外なら未確定バッファに押されたキーを追加
    if (e.key.length <= 1 && e.key !== ' ') {
      this.pending += e.key.toLowerCase()
    }

    // かなを確定
    {
      const { romaji, kana } = this.romajiToKana('hiragana', this.pending)
      this.committable += kana
      this.pending = romaji
    }

    // 変換モードの処理
    if (this.conversion) {
      // 変換を確定する
      if (e.key === 'Enter') {
        this.conversion = false

        this.committable = this.entries.shift()?.candidate ?? this.committable

        await this.ime.clearComposition()

        await this.ime.commitText(this.committable + this.pending)

        await this.ime.setCandidateWindowProperties({
          visible: false,
        })

        this.entries = []

        this.committable = ''
        this.pending = ''
      }

      // 変換候補を表示させる
      if (e.key === ' ') {
        // かなを確定
        {
          const { romaji, kana } = this.romajiToKana(
            'hiragana',
            this.pending,
            true,
          )
          this.committable += kana
          this.pending = romaji
        }

        const candidates = this.dict.get(this.committable)
        if (!candidates || candidates.length < 1) {
          await this.ime.setCandidateWindowProperties({
            visible: false,
          })

          this.entries = []
        } else {
          await this.ime.setCandidateWindowProperties({
            visible: true,
            cursorVisible: false,
            vertical: true,
            pageSize: 7,
          })

          this.entries = candidates.map((c, i) => ({
            annotation: c.annotation,
            candidate: c.candidate,
            id: i + 1,
            label: CANDIDATE_LABEL.charAt(i),
          }))

          await this.ime.setCandidates(this.entries)
        }
      }

      // 変換候補から選択されたものを確定
      if (this.entries.length > 0 && CANDIDATE_LABEL.includes(e.key)) {
        const selected = CANDIDATE_LABEL.indexOf(e.key)

        return this.onCandidateSelected(selected)
      }
    }

    // 変換モードならプリエディト領域に確定可能バッファ+未確定バッファを表示
    if (this.conversion) {
      const composition = '▽' + this.committable + this.pending

      await this.ime.setComposition(composition, composition.length, {
        selectionStart: 0,
        selectionEnd: composition.length,
      })
    }
    // 直接モードなら確定可能バッファを確定して空にし未確定バッファをプリエディトに表示
    else {
      if (this.pending === '') {
        await this.ime.clearComposition()
      } else {
        const composition = this.pending

        await this.ime.setComposition(composition, composition.length, {
          selectionStart: 0,
          selectionEnd: composition.length,
        })
      }

      if (this.committable !== '') {
        await this.ime.commitText(this.committable)

        this.committable = ''
      }
    }

    return true
  }

  public onMenuActivated(name: string) {
    if (name === 'skk-options') {
      window.alert('option')
      return
    }

    window.alert(name)
  }

  private async getDict() {
    this.dict = parse(
      await download('https://skk-dev.github.io/dict/SKK-JISYO.S.gz', 'euc-jp'),
    )
  }

  private async setMenuItems() {
    const items = [
      { id: 'skk-options', label: 'SKKの設定', style: 'check' },
      { id: 'skk-separator', style: 'separator' },
      { id: 'skk-hiragana', label: 'ひらがな', style: 'radio', checked: true },
      { id: 'skk-katakana', label: 'カタカナ', style: 'radio', checked: false },
    ]

    await this.ime.setMenuItems(items)
  }

  private getKana(mode: KanaMode, hira: string, kata: string, han: string) {
    switch (mode) {
      case 'hiragana':
        return hira
      case 'katakana':
        return kata
      case 'halfkana':
        return han
      default:
        const _: never = mode
    }
  }

  private romajiToKana(mode: KanaMode, romaji: string, commit = false) {
    let kana = ''

    // 今後仮名になる可能性があるか?
    const matchable = this.rule.find(([key]) => key.startsWith(romaji))
    // 今のローマ字でマッチする読みの仮名
    const yomi = this.rule.find(([key]) => key === romaji)

    // 最短でマッチした仮名があるなら変換
    if (matchable && yomi && matchable[0] === yomi[0]) {
      const [_key, [hira, kata, han, flag]] = yomi

      kana += this.getKana(mode, hira, kata, han)

      // leave-last な仮名なら最後のローマ字を残す
      romaji = flag === 'leave-last' ? romaji.slice(-1) : ''
    }
    // 確定する為に現時点で変換できる分を全て変換する
    else if (matchable && commit) {
      const lookNext = this.rule.find(
        ([key, [_hira, _kana, _han, _flag]]) => key === romaji,
      )
      if (lookNext) {
        const [_key, [hira, kata, han, _flag]] = lookNext

        kana += this.getKana(mode, hira, kata, han)
      }

      // もう確定するので leave-last は無視
      romaji = ''
    }
    // 今後仮名にならないなら放棄
    else if (!matchable) {
      let prekana = ''
      let willmatch = false

      do {
        prekana += romaji.slice(0, 1)
        romaji = romaji.slice(1)

        // 頭にいる look-next なローマ字を変換
        const lookNext = this.rule.find(
          ([key, [_hira, _kana, _han, flag]]) =>
            key === prekana && flag === 'look-next',
        )
        if (lookNext) {
          const [_key, [hira, kata, han, _flag]] = lookNext

          kana += this.getKana(mode, hira, kata, han)
        }

        // 余計な文字が前に入ったローマ字を変換
        const gleanings = this.rule.find(([key]) => key === romaji)
        if (gleanings) {
          const [_key, [hira, kata, han, flag]] = gleanings

          kana += this.getKana(mode, hira, kata, han)

          // leave-last な仮名なら最後のローマ字を残す
          romaji = flag === 'leave-last' ? romaji.slice(-1) : ''
        }

        // 今後仮名になる可能性が生まれる状態までループ
        willmatch = this.rule.some(([key]) => key.startsWith(romaji))
      } while (!willmatch && romaji.length > 0)
    }

    return { romaji, kana }
  }
}
