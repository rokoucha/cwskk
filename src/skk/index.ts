import { DictionaryEngine, type Candidate } from './dictionary'
import { SKKJisyo } from './dictionary/providers/skk_jisyo'
import { UserJisyo } from './dictionary/providers/user'
import {
  ACCEPTABLE_SPECIAL_KEYS,
  CANDIDATE_LABEL,
  CANDIDATE_PAGE_SIZE,
  CANDIDATE_WINDOW_OPEN_NUM,
  MENU_ITEMS,
} from './constants'
import { kanaToKana } from './kanaToKana'
import { keyToYomi } from './keyToYomi'
import { ASCII_TABLE } from './rules/ascii'
import { ROMAJI_TABLE } from './rules/romaji'
import type {
  AsciiTable,
  CandidateTemplate,
  KanaTable,
  LetterMode,
  MenuItem,
} from './types'

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
  #handlers: Handlers<SKKIMEEvents>

  /** 辞書エンジン */
  #dictionary: DictionaryEngine

  /** 候補ウィンドウの表示内容 */
  #candidates: CandidateTemplate[]

  /** 候補 */
  #entries: Candidate[]

  /** 選択中の候補  */
  #entriesIndex: number

  /** 入力モード */
  #letterMode: LetterMode

  /** 変換テーブル */
  #table: { ascii: AsciiTable; kana: KanaTable }

  /** SKK の状態 */
  #mode: 'direct' | 'conversion' | 'candidate-select'

  /** 打鍵 */
  #keys: string

  /** 確定可能文字 */
  #letters: string

  /** 読み */
  #yomi: string

  /** 送り */
  #okuri: string

  /** 送り(かな) */
  #okuriKana: string

  /** 未確定文字列のカーソル位置 */
  #cursor: number

  /**
   * コンストラクタ
   */
  constructor() {
    this.#handlers = {
      clearComposition: new Set(),
      commitText: new Set(),
      setCandidates: new Set(),
      setCandidateWindowProperties: new Set(),
      setComposition: new Set(),
      setMenuItems: new Set(),
      updateMenuItems: new Set(),
    }

    this.#dictionary = new DictionaryEngine(new UserJisyo(), [
      new SKKJisyo('SKK-JISYO.S'),
    ])

    this.#candidates = []
    this.#entries = []
    this.#entriesIndex = -1
    this.#letterMode = 'hiragana'
    this.#table = { ascii: ASCII_TABLE, kana: ROMAJI_TABLE }

    this.#mode = 'direct'

    this.#keys = ''
    this.#letters = ''

    this.#yomi = ''

    this.#okuri = ''
    this.#okuriKana = ''

    this.#cursor = 0
  }

  /**
   * IME の機能を呼び出すイベントのリスナーを追加
   *
   * @param type 機能の種類
   * @param callback IME の機能を提供するリスナー
   */
  addEventListener<T extends keyof SKKIMEEvents>(
    type: T,
    callback: (
      ev: CustomNamedEvent<T, SKKIMEEvents[T]>,
    ) => void | Promise<void>,
  ) {
    this.#handlers[type].add(callback)
  }

  /**
   * IME の機能を呼び出すイベントのリスナーを削除
   *
   * @param type 機能の種類
   * @param callback IME の機能を提供するリスナー
   */
  removeEventListener<T extends keyof SKKIMEEvents>(
    type: T,
    callback: (
      ev: CustomNamedEvent<T, SKKIMEEvents[T]>,
    ) => void | Promise<void>,
  ) {
    this.#handlers[type].delete(callback)
  }

  /**
   * IME の機能を呼び出す(EventTarget 互換)
   *
   * @param ev 機能のイベント
   */
  dispatchEvent<
    T extends CustomNamedEvent<
      keyof SKKIMEEvents,
      SKKIMEEvents[keyof SKKIMEEvents]
    >,
  >(ev: T) {
    this.#handlers[ev.type as keyof SKKIMEEvents].forEach((h) => h(ev as any))
  }

  /**
   * IME の機能を呼び出す(内部用)
   *
   * @param type 機能の種類
   * @param detail 引数
   */
  #dispatchImeMethod<T extends keyof SKKIMEEvents>(
    type: T,
    detail: SKKIMEEvents[T],
  ) {
    this.dispatchEvent(new CustomNamedEvent(type, { detail }))
  }

  /**
   * セットアップ
   */
  async setup() {
    await this.#setMenuItems()
    await this.#updateMenuItem()

    await this.#dictionary.setup()
  }

  /**
   * 候補選択イベント
   *
   * @param index
   */
  async onCandidateSelected(index: number) {
    await this.#selectCandidate(this.#entriesIndex + index)

    await this.setStatusToIme()
  }

  /**
   * キー入力イベント
   *
   * @param e キーイベント
   *
   * @returns true: IME(SKK) で処理, false: システムで処理
   */
  async onKeyEvent(e: {
    altKey: boolean
    ctrlKey: boolean
    key: string
    shiftKey: boolean
  }): Promise<boolean> {
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

      this.#letterMode = 'hiragana'
    }

    // 各モードごとの処理
    switch (this.#mode) {
      // 直接入力
      case 'direct': {
        // 直接モードでは処理しないキー
        if (
          ['Enter', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(e.key) ||
          (e.ctrlKey && e.key === 'g')
        ) {
          return false
        }

        // かなモードの処理
        if (
          this.#letterMode === 'hiragana' ||
          this.#letterMode === 'katakana' ||
          this.#letterMode === 'halfkana'
        ) {
          // l または L が押されたら英数モードにする
          if (e.key.toLowerCase() === 'l') {
            ignoreThisKey = true

            this.#letterMode = e.shiftKey ? 'wideascii' : 'halfascii'
          }

          // q または C-q が押されたらひらがな・カタカナの切り替えをする(押す度に反転)
          if (e.key === 'q') {
            ignoreThisKey = true

            this.#letterMode =
              this.#letterMode !== 'hiragana'
                ? 'hiragana'
                : e.ctrlKey
                  ? 'halfkana'
                  : 'katakana'
          }

          // かなモードで Shift が押されたら現時点のかなを確定して変換モードにする
          if (
            e.shiftKey &&
            this.#table.kana.convertible.includes(e.key.toLowerCase())
          ) {
            this.#keyToYomi(true)

            this.#cursor = 0

            this.#mode = 'conversion'
          }

          // よみを確定
          if (e.key === 'Enter' || (e.ctrlKey && e.key === 'j')) {
            ignoreThisKey = true

            this.#letters = this.#yomi + this.#okuriKana + this.#keys

            this.#keys = ''
            this.#yomi = ''
            this.#okuri = ''
            this.#okuriKana = ''
            this.#cursor = 0
          }
        }

        break
      }

      // 変換処理中
      case 'conversion': {
        // キャンセル
        if (e.key === 'Escape' || (e.key === 'g' && e.ctrlKey)) {
          this.#mode = 'direct'

          ignoreThisKey = true

          this.#letters = ''

          this.#keys = ''
          this.#yomi = ''
          this.#okuri = ''
          this.#okuriKana = ''
          this.#cursor = 0
        }

        // 送り開始
        if (
          e.shiftKey &&
          this.#okuri === '' &&
          this.#okuriKana === '' &&
          !ACCEPTABLE_SPECIAL_KEYS.includes(e.key) &&
          this.#yomi !== ''
        ) {
          ignoreThisKey = true

          this.#okuri = e.key.toLowerCase()
        }

        // 送り継続
        if (
          this.#okuri !== '' &&
          !ACCEPTABLE_SPECIAL_KEYS.includes(e.key) &&
          !ignoreThisKey
        ) {
          ignoreThisKey = true

          this.#okuri += e.key.toLowerCase()
        }

        // 送り変換
        if (this.#okuri !== '') {
          const { yomi } = keyToYomi({
            keys: this.#okuri,
            letterMode: this.#letterMode,
            table: this.#table,
          })

          this.#okuriKana = yomi
        }

        // 変換を確定する
        if (e.key === 'Enter' || (e.ctrlKey && e.key === 'j')) {
          this.#mode = 'direct'

          ignoreThisKey = true

          this.#letters = this.#yomi + this.#okuriKana + this.#keys

          this.#keys = ''
          this.#yomi = ''
          this.#okuri = ''
          this.#okuriKana = ''
          this.#cursor = 0
        }

        if (e.key === 'ArrowLeft') {
          ignoreThisKey = true

          this.#cursor = 0 < this.#cursor ? this.#cursor - 1 : 0
        }

        if (e.key === 'ArrowRight') {
          ignoreThisKey = true

          this.#cursor =
            this.#cursor < (this.#yomi + this.#okuriKana + this.#keys).length
              ? this.#cursor + 1
              : this.#cursor
        }

        // 変換候補を検索
        if (e.key === ' ' || this.#okuriKana !== '') {
          ignoreThisKey = true

          if (this.#okuriKana === '') {
            const { yomi } = keyToYomi({
              commit: true,
              keys: this.#keys,
              letterMode: this.#letterMode,
              table: this.#table,
            })

            this.#okuriKana = yomi
          }

          const yomi = kanaToKana({
            table: this.#table.kana,
            text: this.#yomi,
            to: 'hiragana',
          })

          this.#entries = await this.#dictionary.search(
            yomi + this.#okuri.slice(0, 1),
          )

          if (this.#entries.length === 0) {
            this.#entries = []

            this.#entriesIndex = -1
          } else {
            this.#mode = 'candidate-select'

            this.#entriesIndex = 0
          }
        }

        // ひらがな⇄カタカナ変換
        if (e.key === 'q') {
          this.#mode = 'direct'

          ignoreThisKey = true

          this.#keyToYomi(true)

          this.#letters =
            this.#letterMode === 'hiragana' || this.#letterMode === 'katakana'
              ? kanaToKana({
                  table: this.#table.kana,
                  text: this.#yomi,
                  to: this.#letterMode === 'hiragana' ? 'katakana' : 'hiragana',
                })
              : this.#yomi

          this.#keys = ''
          this.#yomi = ''
          this.#okuri = ''
          this.#okuriKana = ''
          this.#cursor = 0
        }

        break
      }

      // 候補選択中
      case 'candidate-select': {
        // キャンセル
        if (e.key === 'Escape' || (e.key === 'g' && e.ctrlKey)) {
          this.#mode = 'conversion'

          ignoreThisKey = true

          this.#candidates = []
          this.#entries = []
          this.#entriesIndex = -1
        }

        // 次の候補へ
        if (e.key === ' ') {
          ignoreThisKey = true

          if (this.#entriesIndex + 1 <= CANDIDATE_WINDOW_OPEN_NUM) {
            this.#entriesIndex++
          } else {
            this.#entriesIndex += CANDIDATE_PAGE_SIZE
          }
        }

        // 表示中の候補で変換を確定
        if (this.#candidates.length === 0 && e.key !== ' ' && !ignoreThisKey) {
          await this.#selectCandidate(this.#entriesIndex)

          // Shift が押されていたら変換モードにする
          this.#mode = e.shiftKey ? 'conversion' : 'direct'
        }

        // 候補ウィンドウから選択されたものを確定
        else if (CANDIDATE_LABEL.includes(e.key)) {
          const selected = CANDIDATE_LABEL.indexOf(e.key)

          ignoreThisKey = true

          await this.#selectCandidate(this.#entriesIndex + selected)
        }

        // 選択肢以外のキーなので最初の候補で変換を確定
        else if (this.#table.kana.convertible.includes(e.key.toLowerCase())) {
          await this.#selectCandidate(this.#entriesIndex)
        }

        break
      }
    }

    const previousLength = (this.#yomi + this.#okuriKana + this.#keys).length

    // 特殊キー以外なら未確定バッファに押されたキーを追加、かなモードでは大文字は小文字にする
    if (!ACCEPTABLE_SPECIAL_KEYS.includes(e.key) && !ignoreThisKey) {
      this.#keys +=
        this.#letterMode === 'hiragana' ||
        this.#letterMode === 'katakana' ||
        this.#letterMode === 'halfkana'
          ? e.key.toLowerCase()
          : e.key
    }

    // 打鍵を文字に変換
    this.#keyToYomi()

    const currentLength = (
      this.#yomi +
      this.#okuriKana +
      this.#keys +
      this.#okuri
    ).length

    // Backspace の処理
    if (e.key === 'Backspace') {
      // 未確定文字→確定文字の順に文字を削除、こちら側のバッファが全て空ならシステム側で消してもらう
      // 打鍵
      if (
        (this.#yomi + this.#okuri).length < this.#cursor &&
        this.#cursor <= (this.#yomi + this.#okuri + this.#keys).length
      ) {
        const cursor = this.#cursor - (this.#yomi + this.#okuri).length
        this.#keys = this.#keys.slice(0, cursor - 1) + this.#keys.slice(cursor)
        this.#cursor -= 1
      }
      // 送り
      else if (
        this.#yomi.length < this.#cursor &&
        this.#cursor <= (this.#yomi + this.#okuri).length
      ) {
        const cursor = this.#cursor - this.#yomi.length
        this.#okuri =
          this.#okuri.slice(0, cursor - 1) + this.#okuri.slice(cursor)
        this.#okuriKana =
          this.#okuriKana.slice(0, cursor) + this.#okuriKana.slice(cursor + 1)
        this.#cursor -= 1
      } // 読み
      else if (0 < this.#cursor && this.#cursor <= this.#yomi.length) {
        const cursor = this.#cursor
        this.#yomi = this.#yomi.slice(0, cursor - 1) + this.#yomi.slice(cursor)
        this.#cursor -= 1
      } else {
        return false
      }

      // 候補をクリア
      this.#entries = []

      // 変換バッファが全て空になったら変換モードから離脱
      if (
        this.#keys.length === 0 &&
        this.#okuri.length === 0 &&
        this.#yomi.length === 0
      ) {
        this.#mode = 'direct'
      }
    }

    // Delete の処理
    if (e.key === 'Delete') {
      // 未確定文字→確定文字の順に文字を削除、こちら側のバッファが全て空ならシステム側で消してもらう
      // 打鍵
      if (
        (this.#yomi + this.#okuri).length <= this.#cursor &&
        this.#cursor < (this.#yomi + this.#okuri + this.#keys).length
      ) {
        const cursor = this.#cursor - (this.#yomi + this.#okuri).length
        this.#keys = this.#keys.slice(0, cursor) + this.#keys.slice(cursor + 1)
      }
      // 送り
      else if (
        this.#yomi.length <= this.#cursor &&
        this.#cursor < (this.#yomi + this.#okuri).length
      ) {
        const cursor = this.#cursor - this.#yomi.length
        this.#okuri =
          this.#okuri.slice(0, cursor) + this.#okuri.slice(cursor + 1)
        this.#okuriKana =
          this.#okuriKana.slice(0, cursor) + this.#okuriKana.slice(cursor + 1)
      } // 読み
      else if (0 <= this.#cursor && this.#cursor < this.#yomi.length) {
        const cursor = this.#cursor
        this.#yomi = this.#yomi.slice(0, cursor) + this.#yomi.slice(cursor + 1)
      } else {
        return false
      }

      // 候補をクリア
      // TODO: 選択中の候補を辞書から削除するか尋ねる
      this.#entries = []

      // 変換バッファが全て空になったら変換モードから離脱
      if (
        this.#keys.length === 0 &&
        this.#okuri.length === 0 &&
        this.#yomi.length === 0
      ) {
        this.#mode = 'direct'
      }
    }

    this.#cursor = this.#cursor + (currentLength - previousLength)

    // 表示処理
    await this.setStatusToIme()

    return true
  }

  /**
   * メニュー選択イベント
   *
   * @param id 選択されたメニュー要素の ID
   */
  async onMenuActivated(id: string) {
    if (id === 'skk-options') {
      window.alert('option')
      return
    }
    this.#letterMode = id.slice('skk-'.length) as LetterMode

    await this.#updateMenuItem()
  }

  /**
   * SKK の状態を IME に反映
   */
  async setStatusToIme() {
    await this.#updateMenuItem()

    // 表示する候補がなければ候補ウィンドウを隠す
    if (this.#candidates.length === 0) {
      this.#dispatchImeMethod('setCandidateWindowProperties', {
        visible: false,
      })

      this.#dispatchImeMethod('setCandidates', {
        candidates: this.#candidates,
      })
    }

    switch (this.#mode) {
      case 'direct': {
        if (this.#keys.length === 0) {
          this.#dispatchImeMethod('clearComposition', undefined)
        } else {
          const composition = this.#keys

          this.#dispatchImeMethod('setComposition', {
            text: composition,
            cursor: composition.length,
            properties: {
              selectionStart: 0,
              selectionEnd: composition.length,
            },
          })
        }

        if (this.#letters !== '' || this.#yomi !== '') {
          this.#dispatchImeMethod('commitText', {
            text: this.#letters + this.#yomi,
          })

          this.#yomi = ''
          this.#letters = ''
          this.#cursor = 0
        }

        break
      }

      case 'conversion': {
        if (this.#letters !== '') {
          this.#dispatchImeMethod('commitText', { text: this.#letters })

          this.#letters = ''
        }

        const composition =
          '▽' + this.#yomi + this.#okuriKana + this.#keys + this.#okuri

        if (composition.length <= 1) {
          this.#dispatchImeMethod('clearComposition', undefined)
        } else {
          this.#dispatchImeMethod('setComposition', {
            text: composition,
            cursor: this.#cursor + 1,
            properties: {
              selectionStart: 0,
              selectionEnd: composition.length,
            },
          })
        }

        break
      }

      case 'candidate-select': {
        let yomiOrEntry = this.#entries[this.#entriesIndex].candidate

        if (this.#entriesIndex >= CANDIDATE_WINDOW_OPEN_NUM) {
          yomiOrEntry = this.#yomi

          this.#candidates = this.#entries
            .slice(this.#entriesIndex, this.#entriesIndex + CANDIDATE_PAGE_SIZE)
            .map((e, i) => ({
              candidate: e.candidate,
              id: i + 1,
              label: CANDIDATE_LABEL[i],
              annotation: e.annotation,
            }))

          this.#dispatchImeMethod('setCandidateWindowProperties', {
            currentCandidateIndex:
              this.#entriesIndex - CANDIDATE_WINDOW_OPEN_NUM + 1,
            cursorVisible: false,
            pageSize: CANDIDATE_PAGE_SIZE,
            totalCandidates: this.#entries.length - CANDIDATE_WINDOW_OPEN_NUM,
            vertical: true,
            visible: true,
          })

          this.#dispatchImeMethod('setCandidates', {
            candidates: this.#candidates,
          })
        }

        const composition = '▼' + yomiOrEntry + this.#okuriKana + this.#keys

        this.#dispatchImeMethod('setComposition', {
          text: composition,
          cursor: composition.length,
          properties: { selectionStart: 0, selectionEnd: composition.length },
        })

        break
      }
    }
  }

  /**
   * メニューの内容を設定
   */
  async #setMenuItems() {
    this.#dispatchImeMethod('setMenuItems', { items: MENU_ITEMS })
  }

  /**
   * メニューの内容を更新
   *
   * 入力モードの変更を反映させる時に使う
   */
  async #updateMenuItem() {
    const item = MENU_ITEMS.find((i) => i.id === `skk-${this.#letterMode}`)

    if (!item) return

    item.checked = true

    this.#dispatchImeMethod('updateMenuItems', { items: [item] })
  }

  /**
   * 候補ウィンドウの候補で確定
   *
   * @param index 候補の番号
   */
  async #selectCandidate(index: number) {
    if (index < 0 || this.#entries.length < index) return

    this.#mode = 'direct'

    const { annotation, candidate } = this.#entries[index]

    await this.#dictionary.add(this.#yomi, candidate, annotation)

    this.#letters = candidate + this.#okuriKana

    this.#candidates = []
    this.#entries = []
    this.#entriesIndex = -1

    this.#yomi = ''
    this.#okuri = ''
    this.#okuriKana = ''
    this.#cursor = 0
  }

  /**
   * キーストロークをよみに変換
   *
   * @param commit 現時点の入力で打ち切りにしてよみを確定する
   */
  #keyToYomi(commit = false) {
    const { keys, yomi } = keyToYomi({
      commit,
      keys: this.#keys,
      letterMode: this.#letterMode,
      table: this.#table,
    })

    this.#keys = keys
    this.#yomi += yomi
  }
}
