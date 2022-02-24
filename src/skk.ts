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

  constructor(ime: SKKIMEMethods) {
    this.committable = ''
    this.conversion = false
    this.entries = []
    this.pending = ''
    this.dict = new Map()

    this.ime = ime
  }

  async setup() {
    await this.getDict()
    await this.setMenuItems()
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

  private romajiToKana(
    table: Rule,
    mode: KanaMode,
    romaji: string,
    commit = false,
  ) {
    let kana = ''

    // 今後仮名になる可能性があるか?
    const matchable = table.find(([key]) => key.startsWith(romaji))
    // 今のローマ字でマッチする読みの仮名
    const yomi = table.find(([key]) => key === romaji)

    // 最短でマッチした仮名があるなら変換
    if (matchable && yomi && matchable[0] === yomi[0]) {
      const [_key, [hira, kata, han, flag]] = yomi

      kana += this.getKana(mode, hira, kata, han)

      // leave-last な仮名なら最後のローマ字を残す
      romaji = flag === 'leave-last' ? romaji.slice(-1) : ''
    }
    // 確定する為に現時点で変換できる分を全て変換する
    else if (matchable && commit) {
      const lookNext = ROMAJI_TABLE.find(
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
        const lookNext = ROMAJI_TABLE.find(
          ([key, [_hira, _kana, _han, flag]]) =>
            key === prekana && flag === 'look-next',
        )
        if (lookNext) {
          const [_key, [hira, kata, han, _flag]] = lookNext

          kana += this.getKana(mode, hira, kata, han)
        }

        // 余計な文字が前に入ったローマ字を変換
        const gleanings = ROMAJI_TABLE.find(([key]) => key === romaji)
        if (gleanings) {
          const [_key, [hira, kata, han, flag]] = gleanings

          kana += this.getKana(mode, hira, kata, han)

          // leave-last な仮名なら最後のローマ字を残す
          romaji = flag === 'leave-last' ? romaji.slice(-1) : ''
        }

        // 今後仮名になる可能性が生まれる状態までループ
        willmatch = ROMAJI_TABLE.some(([key]) => key.startsWith(romaji))
      } while (!willmatch && romaji.length > 0)
    }

    return { romaji, kana }
  }

  async onCandidateClicked(candidateID: number) {
    this.conversion = false

    this.committable =
      this.entries[candidateID - 1].candidate ?? this.committable

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

  async onKeyEvent(e: KeyboardEvent) {
    if (e.type !== 'keydown') {
      return false
    }

    if (e.key.charCodeAt(0) === 0xfffd) {
      return false
    }

    if (e.ctrlKey && e.key == 'j') {
      return true
    }

    if (this.conversion && e.key === 'Enter') {
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

      return true
    }

    if (this.conversion && e.key === ' ') {
      // かなを確定
      {
        const { romaji, kana } = this.romajiToKana(
          ROMAJI_TABLE,
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

      return true
    }

    if (
      this.conversion &&
      this.entries.length > 0 &&
      CANDIDATE_LABEL.includes(e.key)
    ) {
      this.conversion = false

      this.committable =
        this.entries[CANDIDATE_LABEL.indexOf(e.key)].candidate ??
        this.committable

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

    if (e.key.length > 1 || e.altKey || e.ctrlKey) {
      return false
    }

    if (!this.conversion && e.shiftKey) {
      // かなを確定
      {
        const { romaji, kana } = this.romajiToKana(
          ROMAJI_TABLE,
          'hiragana',
          this.pending,
        )
        this.committable += kana
        this.pending = romaji
      }

      this.conversion = true
    }

    this.pending += e.key.toLowerCase()

    // かなを確定
    {
      const { romaji, kana } = this.romajiToKana(
        ROMAJI_TABLE,
        'hiragana',
        this.pending,
      )
      this.committable += kana
      this.pending = romaji
    }

    if (this.conversion) {
      const composition = '▽' + this.committable + this.pending

      await this.ime.setComposition(composition, composition.length, {
        selectionStart: 0,
        selectionEnd: composition.length,
      })
    } else {
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

  onMenuActivated(name: string) {
    if (name === 'skk-options') {
      window.alert('option')
      return
    }

    window.alert(name)
  }
}
