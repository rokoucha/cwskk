import { download, parse, Entries } from './dictionary'
import { ASCII_TABLE } from './rules/ascii'
import { ROMAJI_TABLE } from './rules/romaji'
import {
  ACCEPTABLE_SPECIAL_KEYS,
  CANDIDATE_LABEL,
  MENU_ITEMS,
} from './constants'
import type {
  AsciiTable,
  CandidateTemplate,
  KanaTable,
  LetterMode,
  MenuItem,
} from './types'

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
  updateMenuItems(items: MenuItem[]): Promise<void>
}

export class SKK {
  private dict: Entries
  private entries: CandidateTemplate[]
  private ime: SKKIMEMethods
  private letterMode: LetterMode
  private table: { ascii: AsciiTable; kana: KanaTable }
  private mode: 'direct' | 'conversion' | 'candidate-select'

  // 打鍵
  private keys: string
  // 確定可能文字
  private letters: string
  // 読み
  private yomi: string
  // okuri(英字)
  private okuri: string
  // 送り(かな)
  private okuriKana: string

  constructor(ime: SKKIMEMethods) {
    this.dict = new Map()
    this.entries = []
    this.letterMode = 'hiragana'
    this.table = { ascii: ASCII_TABLE, kana: ROMAJI_TABLE }

    this.mode = 'direct'

    this.keys = ''
    this.letters = ''

    this.yomi = ''

    this.okuri = ''
    this.okuriKana = ''

    this.ime = ime
  }

  public async setup() {
    await this.getDict()
    await this.setMenuItems()
    await this.updateMenuItem()
  }

  public async onCandidateSelected(index: number) {
    await this.selectCandidate(index)

    await this.setStatusToIme()

    return true
  }

  public async onKeyEvent(e: KeyboardEvent) {
    if (e.type !== 'keydown') {
      return false
    }

    if (e.key.charCodeAt(0) === 0xfffd) {
      return false
    }

    // 使わない特殊キーは処理しない
    if (
      (e.key.length > 1 && !ACCEPTABLE_SPECIAL_KEYS.includes(e.key)) ||
      e.altKey
    ) {
      return false
    }

    let ignoreThisKey = false

    // C-j はひらがなモードにする
    if (e.ctrlKey && e.key === 'j') {
      ignoreThisKey = true

      this.letterMode = 'hiragana'
    }

    // 各モードごとの処理
    switch (this.mode) {
      // 直接モード
      case 'direct': {
        // かなモードの処理
        if (
          this.letterMode === 'hiragana' ||
          this.letterMode === 'katakana' ||
          this.letterMode === 'halfkana'
        ) {
          // l または L が押されたら英数モードにする
          if (e.key.toLowerCase() === 'l') {
            ignoreThisKey = true

            this.letterMode = e.shiftKey ? 'wideascii' : 'halfascii'
          }

          // q または C-q が押されたらひらがな・カタカナの切り替えをする(押す度に反転)
          if (e.key === 'q') {
            ignoreThisKey = true

            this.letterMode =
              this.letterMode !== 'hiragana'
                ? 'hiragana'
                : e.ctrlKey
                ? 'halfkana'
                : 'katakana'
          }

          // かなモードで Shift が押されたら現時点のかなを確定して変換モードにする
          if (
            e.shiftKey &&
            this.table.kana.convertible.includes(e.key.toLowerCase())
          ) {
            this.keyToYomi(true)

            this.mode = 'conversion'
          }
        }

        break
      }

      // 変換モード
      case 'conversion': {
        // 送り
        if (e.shiftKey && this.okuri === '') {
          this.okuri = e.key.toLowerCase()
        }

        // 変換を確定する
        if (e.key === 'Enter' || (e.ctrlKey && e.key === 'j')) {
          this.mode = 'direct'

          ignoreThisKey = true

          await this.selectCandidate(0)
        }

        // 変換候補を表示させる
        if (e.key === ' ') {
          ignoreThisKey = true

          this.keyToYomi(true)

          this.okuriKana = this.okuri !== '' ? this.yomi.slice(-1) : ''

          const candidates = this.dict.get(
            (this.okuri !== '' ? this.yomi.slice(0, -1) : this.yomi) +
              this.okuri,
          )

          if (!candidates || candidates.length === 0) {
            this.entries = []
          } else {
            this.mode = 'candidate-select'

            this.entries = candidates.map((c, i) => ({
              annotation: c.annotation,
              candidate: c.candidate + this.okuriKana,
              id: i + 1,
              label: CANDIDATE_LABEL.charAt(i),
            }))
          }
        }

        break
      }

      // 候補選択モードの処理
      case 'candidate-select': {
        // 最初の候補で変換を確定
        if (e.key === 'Enter' || (e.ctrlKey && e.key === 'j')) {
          ignoreThisKey = true

          await this.selectCandidate(0)
        }

        // 変換候補から選択されたものを確定
        else if (CANDIDATE_LABEL.includes(e.key)) {
          const selected = CANDIDATE_LABEL.indexOf(e.key)

          ignoreThisKey = true

          await this.selectCandidate(selected)
        }

        // 選択肢以外のキーなので最初の候補で変換を確定
        else if (this.table.kana.convertible.includes(e.key.toLowerCase())) {
          await this.selectCandidate(0)
        }

        break
      }
    }

    // 特殊キー以外なら未確定バッファに押されたキーを追加、かなモードでは大文字は小文字にする
    if (!ACCEPTABLE_SPECIAL_KEYS.includes(e.key) && !ignoreThisKey) {
      this.keys +=
        this.letterMode === 'hiragana' ||
        this.letterMode === 'katakana' ||
        this.letterMode === 'halfkana'
          ? e.key.toLowerCase()
          : e.key
    }

    // 打鍵を文字に変換
    this.keyToYomi()

    // Backspace の処理
    if (e.key === 'Backspace') {
      // 未確定文字→確定文字の順に文字を削除、こちら側のバッファが全て空ならシステム側で消してもらう
      if (this.keys.length > 0) {
        this.keys = this.keys.slice(0, -1)
      } else if (this.okuri.length > 0) {
        this.okuri = ''
        this.okuriKana = ''
      } else if (this.yomi.length > 0) {
        this.yomi = this.yomi.slice(0, -1)
      } else if (this.letters.length > 0) {
        this.letters = this.letters.slice(0, -1)
      } else {
        return false
      }

      // 候補をクリア
      this.entries = []

      // 変換バッファが全て空になったら変換モードから離脱
      if (
        this.keys.length === 0 &&
        this.okuri.length === 0 &&
        this.yomi.length === 0
      ) {
        this.mode = 'direct'
      }
    }

    // 確定処理
    if (e.key === 'Enter') {
      this.letters = this.yomi + this.okuriKana + this.keys
      this.keys = ''
    }

    // 表示処理
    await this.setStatusToIme()

    return true
  }

  public async onMenuActivated(name: string) {
    if (name === 'skk-options') {
      window.alert('option')
      return
    }
    this.letterMode = name.slice('skk-'.length) as LetterMode

    await this.updateMenuItem()
  }

  private async setStatusToIme() {
    // メニュー状態を更新
    await this.updateMenuItem()

    // 候補表示
    if (this.entries.length === 0) {
      await this.ime.setCandidateWindowProperties({
        visible: false,
      })
    } else {
      await this.ime.setCandidateWindowProperties({
        visible: true,
        cursorVisible: false,
        vertical: true,
        pageSize: 7,
      })

      await this.ime.setCandidates(this.entries)
    }

    // 直接モードなら確定可能バッファを確定して空にし未確定バッファをプリエディトに表示
    if (this.mode === 'direct') {
      if (this.keys === '') {
        await this.ime.clearComposition()
      } else {
        const composition = this.keys

        await this.ime.setComposition(composition, composition.length, {
          selectionStart: 0,
          selectionEnd: composition.length,
        })
      }

      if (this.letters !== '' || this.yomi !== '') {
        await this.ime.commitText(this.letters + this.yomi)

        this.yomi = ''
        this.letters = ''
      }
    }
    // 変換モードならプリエディト領域に確定可能バッファ+未確定バッファを表示
    else {
      const composition = '▽' + this.yomi + this.okuriKana + this.keys

      await this.ime.setComposition(composition, composition.length, {
        selectionStart: 0,
        selectionEnd: composition.length,
      })
    }
  }

  private async getDict() {
    this.dict = parse(
      await download('https://skk-dev.github.io/dict/SKK-JISYO.S.gz', 'euc-jp'),
    )
  }

  private async setMenuItems() {
    await this.ime.setMenuItems(MENU_ITEMS)
  }

  private async updateMenuItem() {
    const item = MENU_ITEMS.find((i) => i.id === `skk-${this.letterMode}`)

    if (!item) return

    item.checked = true

    await this.ime.updateMenuItems([item])
  }

  private async selectCandidate(index: number) {
    if (index < 0 || this.entries.length <= index) return

    this.mode = 'direct'

    this.letters =
      (this.entries[index]?.candidate ?? this.yomi) + this.okuriKana

    this.entries = []

    this.yomi = ''
    this.okuri = ''
    this.okuriKana = ''
  }

  private getKana(hiragana: string, katakana: string, halfkana: string) {
    switch (this.letterMode) {
      case 'hiragana':
        return hiragana
      case 'katakana':
        return katakana
      case 'halfkana':
        return halfkana
      default:
        throw new Error('Called "getKana()" in ASCII input mode.')
    }
  }

  private keyToYomi(commit = false) {
    // 英数モード
    if (this.letterMode === 'halfascii' || this.letterMode === 'wideascii') {
      const rule = this.table.ascii.rule

      const letters = rule.find(([key]) => key.startsWith(this.keys))

      if (letters) {
        const [half, wide] = letters

        this.keys = ''

        this.yomi = this.letterMode === 'halfascii' ? half : wide
      }

      return
    }

    // かなモード
    const rule = this.table.kana.rule

    // 今後仮名になる可能性があるか?
    const matchable = rule.find(([key]) => key.startsWith(this.keys))

    // 今のローマ字でマッチする読みの仮名
    const yomi = rule.find(([key]) => key === this.keys)

    // 最短でマッチした仮名があるなら変換
    if (matchable && yomi && matchable[0] === yomi[0]) {
      const [_key, [hira, kata, han, flag]] = yomi

      this.yomi += this.getKana(hira, kata, han)

      // leave-last な仮名なら最後のローマ字を残す
      this.keys = flag === 'leave-last' ? this.keys.slice(-1) : ''
    }
    // 確定する為に現時点で変換できる分を全て変換する
    else if (matchable && commit) {
      const forceComitYomi = rule.find(
        ([key, [_hira, _kana, _han, _flag]]) => key === this.keys,
      )
      if (forceComitYomi) {
        const [_key, [hira, kata, han, _flag]] = forceComitYomi

        this.yomi += this.getKana(hira, kata, han)
      }

      // もう確定するので leave-last は無視
      this.keys = ''
    }
    // 今後仮名にならないなら放棄
    else if (!matchable) {
      let prekana = ''
      let willmatch = false

      do {
        prekana += this.keys.slice(0, 1)
        this.keys = this.keys.slice(1)

        // 頭にいる look-next なローマ字を変換
        const lookNext = rule.find(
          ([key, [_hira, _kana, _han, flag]]) =>
            key === prekana && flag === 'look-next',
        )
        if (lookNext) {
          const [_key, [hira, kata, han, _flag]] = lookNext

          this.yomi += this.getKana(hira, kata, han)
        }

        // 余計な文字が前に入ったローマ字を変換
        const gleanings = rule.find(([key]) => key === this.keys)
        if (gleanings) {
          const [_key, [hira, kata, han, flag]] = gleanings

          this.yomi += this.getKana(hira, kata, han)

          // leave-last な仮名なら最後のローマ字を残す
          this.keys = flag === 'leave-last' ? this.keys.slice(-1) : ''
        }

        // 今後仮名になる可能性が生まれる状態までループ
        willmatch = rule.some(([key]) => key.startsWith(this.keys))
      } while (!willmatch && this.keys.length > 0)
    }
  }
}
