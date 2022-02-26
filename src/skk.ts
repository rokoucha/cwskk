import { download, parse, Entries } from './dictionary'
import { ROMAJI_TABLE } from './rules/romaji'
import { ACCEPTABLE_SPECIAL_KEYS, CANDIDATE_LABEL } from './constants'
import type { CandidateTemplate, KanaMode, MenuItem, Table } from './types'

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
  private dict: Entries
  private entries: CandidateTemplate[]
  private ime: SKKIMEMethods
  private kanaMode: KanaMode
  private pending: string
  private table: Table

  constructor(ime: SKKIMEMethods) {
    this.committable = ''
    this.conversion = false
    this.dict = new Map()
    this.entries = []
    this.kanaMode = 'hiragana'
    this.pending = ''
    this.table = ROMAJI_TABLE

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

    // C-j は握り潰す
    // TODO: あとで Enter と同一扱いにする
    if (e.ctrlKey && e.key == 'j') {
      return true
    }

    // 使わない特殊キーは処理しない
    if (
      (e.key.length > 1 && !ACCEPTABLE_SPECIAL_KEYS.includes(e.key)) ||
      e.altKey ||
      e.ctrlKey
    ) {
      return false
    }

    let ignoreThisKey = false

    // Shift が押されたら現時点のかなを確定して変換モードにする
    if (
      !this.conversion &&
      e.shiftKey &&
      this.table.convertible.includes(e.key.toLowerCase())
    ) {
      // かなを確定
      this.romajiToKana()

      this.conversion = true
    }

    // 変換モードの処理
    if (this.conversion) {
      // 変換を確定する
      if (e.key === 'Enter') {
        this.conversion = false

        this.committable = this.entries.shift()?.candidate ?? this.committable

        await this.ime.setCandidateWindowProperties({
          visible: false,
        })

        this.entries = []

        this.pending = ''
      }

      // 変換候補を表示させる
      if (e.key === ' ') {
        ignoreThisKey = true

        // かなを確定
        this.romajiToKana(true)

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
      if (this.entries.length > 0) {
        if (CANDIDATE_LABEL.includes(e.key)) {
          ignoreThisKey = true

          const selected = CANDIDATE_LABEL.indexOf(e.key)

          return this.onCandidateSelected(selected)
        } else if (this.table.convertible.includes(e.key.toLowerCase())) {
          this.conversion = false

          this.committable = this.entries[0].candidate ?? this.committable

          await this.ime.setCandidateWindowProperties({
            visible: false,
          })

          this.entries = []
        }
      }
    }

    // 特殊キー以外なら未確定バッファに押されたキーを追加
    if (!ACCEPTABLE_SPECIAL_KEYS.includes(e.key) && !ignoreThisKey) {
      this.pending += e.key.toLowerCase()
    }

    // かなを確定
    this.romajiToKana()

    // Backspace の処理
    if (e.key === 'Backspace') {
      // 未確定文字→確定文字の順に文字を削除、こちら側のバッファが全て空ならシステム側で消してもらう
      if (this.pending.length > 0) {
        this.pending = this.pending.slice(0, -1)
      } else if (this.committable.length > 0) {
        this.committable = this.committable.slice(0, -1)
      } else {
        return false
      }

      // 候補をクリア
      await this.ime.setCandidateWindowProperties({
        visible: false,
      })
      this.entries = []

      // バッファが全て空になったら変換モードから離脱
      if (this.pending.length === 0 && this.committable.length === 0) {
        this.conversion = false
      }
    }

    // 確定処理
    if (e.key === 'Enter') {
      this.committable = this.committable + this.pending
      this.pending = ''
    }

    // 表示処理
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

  private getKana(hira: string, kata: string, han: string) {
    switch (this.kanaMode) {
      case 'hiragana':
        return hira
      case 'katakana':
        return kata
      case 'halfkana':
        return han
      default:
        const _: never = this.kanaMode
    }
  }

  private romajiToKana(commit = false) {
    // 今後仮名になる可能性があるか?
    const matchable = this.table.rule.find(([key]) =>
      key.startsWith(this.pending),
    )
    // 今のローマ字でマッチする読みの仮名
    const yomi = this.table.rule.find(([key]) => key === this.pending)

    // 最短でマッチした仮名があるなら変換
    if (matchable && yomi && matchable[0] === yomi[0]) {
      const [_key, [hira, kata, han, flag]] = yomi

      this.committable += this.getKana(hira, kata, han)

      // leave-last な仮名なら最後のローマ字を残す
      this.pending = flag === 'leave-last' ? this.pending.slice(-1) : ''
    }
    // 確定する為に現時点で変換できる分を全て変換する
    else if (matchable && commit) {
      const forceComitYomi = this.table.rule.find(
        ([key, [_hira, _kana, _han, _flag]]) => key === this.pending,
      )
      if (forceComitYomi) {
        const [_key, [hira, kata, han, _flag]] = forceComitYomi

        this.committable += this.getKana(hira, kata, han)
      }

      // もう確定するので leave-last は無視
      this.pending = ''
    }
    // 今後仮名にならないなら放棄
    else if (!matchable) {
      let prekana = ''
      let willmatch = false

      do {
        prekana += this.pending.slice(0, 1)
        this.pending = this.pending.slice(1)

        // 頭にいる look-next なローマ字を変換
        const lookNext = this.table.rule.find(
          ([key, [_hira, _kana, _han, flag]]) =>
            key === prekana && flag === 'look-next',
        )
        if (lookNext) {
          const [_key, [hira, kata, han, _flag]] = lookNext

          this.committable += this.getKana(hira, kata, han)
        }

        // 余計な文字が前に入ったローマ字を変換
        const gleanings = this.table.rule.find(([key]) => key === this.pending)
        if (gleanings) {
          const [_key, [hira, kata, han, flag]] = gleanings

          this.committable += this.getKana(hira, kata, han)

          // leave-last な仮名なら最後のローマ字を残す
          this.pending = flag === 'leave-last' ? this.pending.slice(-1) : ''
        }

        // 今後仮名になる可能性が生まれる状態までループ
        willmatch = this.table.rule.some(([key]) =>
          key.startsWith(this.pending),
        )
      } while (!willmatch && this.pending.length > 0)
    }
  }
}
