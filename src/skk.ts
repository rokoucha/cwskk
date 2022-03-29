import { download, parse, type Entries, type Candidate } from './dictionary'
import { ASCII_TABLE } from './rules/ascii'
import { ROMAJI_TABLE } from './rules/romaji'
import {
  ACCEPTABLE_SPECIAL_KEYS,
  CANDIDATE_LABEL,
  CANDIDATE_PAGE_SIZE,
  CANDIDATE_WINDOW_OPEN_NUM,
  MENU_ITEMS,
} from './constants'
import type {
  AsciiTable,
  CandidateTemplate,
  KanaTable,
  LetterMode,
  MenuItem,
} from './types'
import runes from 'runes'

class CustomNamedEvent<K, T> extends Event {
  readonly detail: T

  constructor(type: K, eventInitDict?: CustomEventInit<T>) {
    super(type as any as string, eventInitDict)

    this.detail = eventInitDict?.detail!
  }
}

export type SKKIMEEvents = {
  clearComposition: void
  commitText: { text: string }
  setCandidates: { candidates: CandidateTemplate[] }
  setCandidateWindowProperties: {
    currentCandidateIndex?: number
    cursorVisible?: boolean
    pageSize?: number
    totalCandidates?: number
    vertical?: boolean
    visible?: boolean
  }
  setComposition: {
    text: string
    cursor: number
    properties?: {
      selectionStart?: number | undefined
      selectionEnd?: number | undefined
    }
  }
  setMenuItems: { items: MenuItem[] }
  updateMenuItems: { items: MenuItem[] }
}

export type SKKIMEEvent<T extends keyof SKKIMEEvents> = CustomNamedEvent<
  T,
  SKKIMEEvents[T]
>

export type SKKIMEEventHandler<T extends keyof SKKIMEEvents> = (
  ev: SKKIMEEvent<T>,
) => void | Promise<void>

type Handlers<T extends Record<string, any>> = {
  [K in keyof T]: Set<(ev: CustomNamedEvent<K, T[K]>) => void | Promise<void>>
}

/**
 * SKK - Simple Kana to Kanji conversion program
 */
export class SKK {
  /** IME の機能を呼び出す為のハンドラリスト */
  private handlers: Handlers<SKKIMEEvents>

  /** 辞書 */
  private dict: Entries

  /** 候補ウィンドウの表示内容 */
  private candidates: CandidateTemplate[]

  /** 候補 */
  private entries: Candidate[]

  /** 選択中の候補  */
  private entriesIndex: number

  /** 入力モード */
  private letterMode: LetterMode

  /** 変換テーブル */
  private table: { ascii: AsciiTable; kana: KanaTable }

  /** SKK の状態 */
  private mode: 'direct' | 'conversion' | 'candidate-select'

  /** 打鍵 */
  private keys: string

  /** 確定可能文字 */
  private letters: string

  /** 読み */
  private yomi: string

  /** okuri(英字) */
  private okuri: string

  /** 送り(かな) */
  private okuriKana: string

  /** 未確定文字列のカーソル位置 */
  private cursor: number

  /**
   * コンストラクタ
   */
  constructor() {
    this.handlers = {
      clearComposition: new Set(),
      commitText: new Set(),
      setCandidates: new Set(),
      setCandidateWindowProperties: new Set(),
      setComposition: new Set(),
      setMenuItems: new Set(),
      updateMenuItems: new Set(),
    }

    this.dict = new Map()
    this.candidates = []
    this.entries = []
    this.entriesIndex = -1
    this.letterMode = 'hiragana'
    this.table = { ascii: ASCII_TABLE, kana: ROMAJI_TABLE }

    this.mode = 'direct'

    this.keys = ''
    this.letters = ''

    this.yomi = ''

    this.okuri = ''
    this.okuriKana = ''

    this.cursor = 0
  }

  /**
   * IME の機能を呼び出すイベントのリスナーを追加
   *
   * @param type 機能の種類
   * @param callback IME の機能を提供するリスナー
   */
  public addEventListener<T extends keyof SKKIMEEvents>(
    type: T,
    callback: (
      ev: CustomNamedEvent<T, SKKIMEEvents[T]>,
    ) => void | Promise<void>,
  ) {
    this.handlers[type].add(callback)
  }

  /**
   * IME の機能を呼び出すイベントのリスナーを削除
   *
   * @param type 機能の種類
   * @param callback IME の機能を提供するリスナー
   */
  public removeEventListener<T extends keyof SKKIMEEvents>(
    type: T,
    callback: (
      ev: CustomNamedEvent<T, SKKIMEEvents[T]>,
    ) => void | Promise<void>,
  ) {
    this.handlers[type].delete(callback)
  }

  /**
   * IME の機能を呼び出す(EventTarget 互換)
   *
   * @param ev 機能のイベント
   */
  public dispatchEvent<
    T extends CustomNamedEvent<
      keyof SKKIMEEvents,
      SKKIMEEvents[keyof SKKIMEEvents]
    >,
  >(ev: T) {
    this.handlers[ev.type as keyof SKKIMEEvents].forEach((h) => h(ev as any))
  }

  /**
   * IME の機能を呼び出す(内部用)
   *
   * @param type 機能の種類
   * @param detail 引数
   */
  private dispatchImeMethod<T extends keyof SKKIMEEvents>(
    type: T,
    detail: SKKIMEEvents[T],
  ) {
    this.dispatchEvent(new CustomNamedEvent(type, { detail }))
  }

  /**
   * セットアップ
   */
  public async setup() {
    await this.getDict()
    await this.setMenuItems()
    await this.updateMenuItem()
  }

  /**
   * 候補選択イベント
   *
   * @param index
   */
  public async onCandidateSelected(index: number) {
    await this.selectCandidate(index)

    await this.setStatusToIme()
  }

  /**
   * キー入力イベント
   *
   * @param e キーイベント
   *
   * @returns true: IME(SKK) で処理, false: システムで処理
   */
  public async onKeyEvent(e: KeyboardEvent): Promise<boolean> {
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
      // 直接入力
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

          // よみを確定
          if (e.key === 'Enter' || (e.ctrlKey && e.key === 'j')) {
            ignoreThisKey = true

            this.letters = this.yomi + this.okuriKana + this.keys

            this.keys = ''
            this.yomi = ''
            this.okuri = ''
            this.okuriKana = ''
            this.cursor = 0
          }
        }

        // 直接モードでは処理しないキー
        if (['Enter', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(e.key)) {
          return false
        }

        break
      }

      // 変換処理中
      case 'conversion': {
        // キャンセル
        if (e.key === 'Escape' || (e.key === 'g' && e.ctrlKey)) {
          this.mode = 'direct'

          ignoreThisKey = true

          this.letters = ''

          this.keys = ''
          this.yomi = ''
          this.okuri = ''
          this.okuriKana = ''
          this.cursor = 0
        }

        // 送り
        if (e.shiftKey && this.okuri === '' && this.yomi !== '') {
          this.okuri = e.key.toLowerCase()
        }

        // 変換を確定する
        if (e.key === 'Enter' || (e.ctrlKey && e.key === 'j')) {
          this.mode = 'direct'

          ignoreThisKey = true

          this.letters = this.yomi + this.okuriKana + this.keys

          this.keys = ''
          this.yomi = ''
          this.okuri = ''
          this.okuriKana = ''
          this.cursor = 0
        }

        if (e.key === 'ArrowLeft') {
          ignoreThisKey = true

          this.cursor = 0 < this.cursor ? this.cursor - 1 : 0
        }

        if (e.key === 'ArrowRight') {
          ignoreThisKey = true

          this.cursor =
            this.cursor < (this.yomi + this.okuriKana + this.keys).length
              ? this.cursor + 1
              : this.cursor
        }

        // 変換候補を検索
        if (e.key === ' ') {
          ignoreThisKey = true

          this.keyToYomi(true)

          const yomi = this.kanaToKana(this.letterMode, 'hiragana', this.yomi)

          this.okuriKana = this.okuri !== '' ? this.yomi.slice(-1) : ''

          this.entries =
            this.dict.get(
              (this.okuri !== '' ? yomi.slice(0, -1) : yomi) + this.okuri,
            ) ?? []

          if (this.entries.length === 0) {
            this.entries = []

            this.entriesIndex = -1
          } else {
            this.mode = 'candidate-select'

            this.entriesIndex = 0
          }
        }

        // ひらがな⇄カタカナ変換
        if (e.key === 'q') {
          this.mode = 'direct'

          ignoreThisKey = true

          this.keyToYomi(true)

          this.letters =
            this.letterMode === 'hiragana' || this.letterMode === 'katakana'
              ? this.kanaToKana(
                  this.letterMode,
                  this.letterMode === 'hiragana' ? 'katakana' : 'hiragana',
                  this.yomi,
                )
              : this.yomi

          this.keys = ''
          this.yomi = ''
          this.okuri = ''
          this.okuriKana = ''
          this.cursor = 0
        }

        break
      }

      // 候補選択中
      case 'candidate-select': {
        // キャンセル
        if (e.key === 'Escape' || (e.key === 'g' && e.ctrlKey)) {
          this.mode = 'conversion'

          ignoreThisKey = true

          this.candidates = []
          this.entries = []
          this.entriesIndex = -1
        }

        // 次の候補へ
        if (e.key === ' ') {
          ignoreThisKey = true

          if (this.entriesIndex + 1 <= CANDIDATE_WINDOW_OPEN_NUM) {
            this.entriesIndex++
          } else {
            this.entriesIndex += CANDIDATE_PAGE_SIZE
          }
        }

        // 表示中の候補で変換を確定
        if (this.candidates.length === 0 && e.key !== ' ' && !ignoreThisKey) {
          // Shift が押されていたら変換モードにする
          this.mode = e.shiftKey ? 'conversion' : 'direct'

          this.letters =
            (this.entries[this.entriesIndex].candidate ?? this.yomi) +
            this.okuriKana

          this.candidates = []
          this.entries = []
          this.entriesIndex = -1

          this.yomi = ''
          this.okuri = ''
          this.okuriKana = ''
          this.cursor = 0
        }

        // 候補ウィンドウから選択されたものを確定
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

    const previousLength = (this.yomi + this.okuriKana + this.keys).length

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

    const currentLength = (this.yomi + this.okuriKana + this.keys).length

    // Backspace の処理
    if (e.key === 'Backspace') {
      // 未確定文字→確定文字の順に文字を削除、こちら側のバッファが全て空ならシステム側で消してもらう
      // 打鍵
      if (
        (this.yomi + this.okuri).length < this.cursor &&
        this.cursor <= (this.yomi + this.okuri + this.keys).length
      ) {
        const cursor = this.cursor - (this.yomi + this.okuri).length
        this.keys = this.keys.slice(0, cursor - 1) + this.keys.slice(cursor)
        this.cursor -= 1
      }
      // 送り
      else if (
        this.yomi.length < this.cursor &&
        this.cursor <= (this.yomi + this.okuri).length
      ) {
        const cursor = this.cursor - this.yomi.length
        this.okuri = this.okuri.slice(0, cursor - 1) + this.okuri.slice(cursor)
        this.okuriKana =
          this.okuriKana.slice(0, cursor) + this.okuriKana.slice(cursor + 1)
        this.cursor -= 1
      } // 読み
      else if (0 < this.cursor && this.cursor <= this.yomi.length) {
        const cursor = this.cursor
        this.yomi = this.yomi.slice(0, cursor - 1) + this.yomi.slice(cursor)
        this.cursor -= 1
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

    // Delete の処理
    if (e.key === 'Delete') {
      // 未確定文字→確定文字の順に文字を削除、こちら側のバッファが全て空ならシステム側で消してもらう
      // 打鍵
      if (
        (this.yomi + this.okuri).length <= this.cursor &&
        this.cursor < (this.yomi + this.okuri + this.keys).length
      ) {
        const cursor = this.cursor - (this.yomi + this.okuri).length
        this.keys = this.keys.slice(0, cursor) + this.keys.slice(cursor + 1)
      }
      // 送り
      else if (
        this.yomi.length <= this.cursor &&
        this.cursor < (this.yomi + this.okuri).length
      ) {
        const cursor = this.cursor - this.yomi.length
        this.okuri = this.okuri.slice(0, cursor) + this.okuri.slice(cursor + 1)
        this.okuriKana =
          this.okuriKana.slice(0, cursor) + this.okuriKana.slice(cursor + 1)
      } // 読み
      else if (0 <= this.cursor && this.cursor < this.yomi.length) {
        const cursor = this.cursor
        this.yomi = this.yomi.slice(0, cursor) + this.yomi.slice(cursor + 1)
      } else {
        return false
      }

      // 候補をクリア
      // TODO: 選択中の候補を辞書から削除するか尋ねる
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

    this.cursor = this.cursor + (currentLength - previousLength)

    // 表示処理
    await this.setStatusToIme()

    return true
  }

  /**
   * メニュー選択イベント
   *
   * @param id 選択されたメニュー要素の ID
   */
  public async onMenuActivated(id: string) {
    if (id === 'skk-options') {
      window.alert('option')
      return
    }
    this.letterMode = id.slice('skk-'.length) as LetterMode

    await this.updateMenuItem()
  }

  /**
   * SKK の状態を IME に反映
   */
  private async setStatusToIme() {
    await this.updateMenuItem()

    // 表示する候補がなければ候補ウィンドウを隠す
    if (this.candidates.length === 0) {
      this.dispatchImeMethod('setCandidateWindowProperties', { visible: true })
    }

    switch (this.mode) {
      case 'direct': {
        if (this.keys.length === 0) {
          this.dispatchImeMethod('clearComposition', undefined)
        } else {
          const composition = this.keys

          this.dispatchImeMethod('setComposition', {
            text: composition,
            cursor: composition.length,
            properties: {
              selectionStart: 0,
              selectionEnd: composition.length,
            },
          })
        }

        if (this.letters !== '' || this.yomi !== '') {
          this.dispatchImeMethod('commitText', {
            text: this.letters + this.yomi,
          })

          this.yomi = ''
          this.letters = ''
        }

        break
      }

      case 'conversion': {
        if (this.letters !== '') {
          this.dispatchImeMethod('commitText', { text: this.letters })

          this.letters = ''
        }

        const composition = '▽' + this.yomi + this.okuriKana + this.keys

        if (composition.length <= 1) {
          this.dispatchImeMethod('clearComposition', undefined)
        } else {
          this.dispatchImeMethod('setComposition', {
            text: composition,
            cursor: this.cursor + 1,
            properties: {
              selectionStart: 0,
              selectionEnd: composition.length,
            },
          })
        }

        break
      }

      case 'candidate-select': {
        let yomiOrEntry = this.entries[this.entriesIndex].candidate

        if (this.entriesIndex >= CANDIDATE_WINDOW_OPEN_NUM) {
          yomiOrEntry = this.yomi

          this.candidates = this.entries
            .slice(this.entriesIndex, this.entriesIndex + CANDIDATE_PAGE_SIZE)
            .map((e, i) => ({
              candidate: e.candidate,
              id: i + 1,
              label: CANDIDATE_LABEL[i],
              annotation: e.annotation,
            }))

          this.dispatchImeMethod('setCandidateWindowProperties', {
            currentCandidateIndex:
              this.entriesIndex - CANDIDATE_WINDOW_OPEN_NUM + 1,
            cursorVisible: false,
            pageSize: CANDIDATE_PAGE_SIZE,
            totalCandidates: this.entries.length - CANDIDATE_WINDOW_OPEN_NUM,
            vertical: true,
            visible: true,
          })

          this.dispatchImeMethod('setCandidates', {
            candidates: this.candidates,
          })
        }

        const composition = '▽' + yomiOrEntry + this.okuriKana + this.keys

        this.dispatchImeMethod('setComposition', {
          text: composition,
          cursor: composition.length,
          properties: { selectionStart: 0, selectionEnd: composition.length },
        })

        break
      }
    }
  }

  /**
   * 辞書を取得
   */
  private async getDict() {
    this.dict = parse(
      await download('https://skk-dev.github.io/dict/SKK-JISYO.S.gz', 'euc-jp'),
    )
  }

  /**
   * メニューの内容を設定
   */
  private async setMenuItems() {
    this.dispatchImeMethod('setMenuItems', { items: MENU_ITEMS })
  }

  /**
   * メニューの内容を更新
   *
   * 入力モードの変更を反映させる時に使う
   */
  private async updateMenuItem() {
    const item = MENU_ITEMS.find((i) => i.id === `skk-${this.letterMode}`)

    if (!item) return

    item.checked = true

    this.dispatchImeMethod('updateMenuItems', { items: [item] })
  }

  /**
   * 候補ウィンドウの候補で確定
   *
   * @param index 候補の番号
   */
  private async selectCandidate(index: number) {
    if (index < 0 || this.candidates.length <= index) return

    this.mode = 'direct'

    this.letters =
      (this.candidates[index].candidate ?? this.yomi) + this.okuriKana

    this.candidates = []
    this.entries = []
    this.entriesIndex = -1

    this.yomi = ''
    this.okuri = ''
    this.okuriKana = ''
  }

  /**
   * 入力モードから文字を選択
   *
   * @param mode 入力モード
   * @param hiragana ひらがなでの文字
   * @param katakana カタカナでの文字
   * @param halfkana 半角ｶﾀｶﾅでの文字
   *
   * @returns 現在の入力モードに紐づく文字
   */
  private getKana(
    mode: LetterMode,
    hiragana: string,
    katakana: string,
    halfkana: string,
  ) {
    switch (mode) {
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

  /**
   * キーストロークをよみに変換
   *
   * @param commit 現時点の入力で打ち切りにしてよみを確定する
   */
  private keyToYomi(commit = false) {
    // 英数モード
    if (this.letterMode === 'halfascii' || this.letterMode === 'wideascii') {
      const rule = this.table.ascii.rule

      const letters = rule.find(
        ([key]) => this.keys !== '' && key.startsWith(this.keys),
      )

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
    const matchable = rule.find(
      ([key]) => this.keys !== '' && key.startsWith(this.keys),
    )

    // 今のローマ字でマッチする読みの仮名
    const yomi = rule.find(([key]) => key === this.keys)

    // 最短でマッチした仮名があるなら変換
    if (matchable && yomi && matchable[0] === yomi[0]) {
      const [_key, [hira, kata, han, flag]] = yomi

      this.yomi += this.getKana(this.letterMode, hira, kata, han)

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

        this.yomi += this.getKana(this.letterMode, hira, kata, han)
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

          this.yomi += this.getKana(this.letterMode, hira, kata, han)
        }

        // 余計な文字が前に入ったローマ字を変換
        const gleanings = rule.find(([key]) => key === this.keys)
        if (gleanings) {
          const [_key, [hira, kata, han, flag]] = gleanings

          this.yomi += this.getKana(this.letterMode, hira, kata, han)

          // leave-last な仮名なら最後のローマ字を残す
          this.keys = flag === 'leave-last' ? this.keys.slice(-1) : ''
        }

        // 今後仮名になる可能性が生まれる状態までループ
        willmatch = rule.some(([key]) => key.startsWith(this.keys))
      } while (!willmatch && this.keys.length > 0)
    }
  }

  /**
   * かなを別のかなに変換
   *
   * @param from 現在の入力モード
   * @param to 変換先の入力モード
   * @param text 変換する文字列
   * @returns 変換後の文字列
   */
  private kanaToKana(from: LetterMode, to: LetterMode, text: string): string {
    const characters = runes(text)

    return characters
      .map((yomi) => {
        const rule = this.table.kana.rule.find(
          ([_key, [hira, kata, han]]) =>
            this.getKana(from, hira, kata, han) === yomi,
        )
        const [_key, [hira, kata, han]] = rule ?? ['', ['', '', '']]

        return this.getKana(to, hira, kata, han)
      })
      .join('')
  }
}
