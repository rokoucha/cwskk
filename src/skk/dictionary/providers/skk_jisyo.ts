import { inflate } from 'pako'
import { Candidate, DictionaryProvider } from '../index'
import { parse } from '../parser'

/**
 * SKK 辞書の名前
 */
type Name =
  | 'SKK-JISYO.JIS2'
  | 'SKK-JISYO.JIS2004'
  | 'SKK-JISYO.JIS3_4'
  | 'SKK-JISYO.L'
  | 'SKK-JISYO.L.unannotated'
  | 'SKK-JISYO.M'
  | 'SKK-JISYO.ML'
  | 'SKK-JISYO.S'
  | 'SKK-JISYO.assoc'
  | 'SKK-JISYO.china_taiwan'
  | 'SKK-JISYO.edict'
  | 'SKK-JISYO.edict2'
  | 'SKK-JISYO.emoji'
  | 'SKK-JISYO.fullname'
  | 'SKK-JISYO.geo'
  | 'SKK-JISYO.hukugougo'
  | 'SKK-JISYO.itaiji'
  | 'SKK-JISYO.itaiji.JIS3_4'
  | 'SKK-JISYO.ivd'
  | 'SKK-JISYO.jinmei'
  | 'SKK-JISYO.law'
  | 'SKK-JISYO.lisp'
  | 'SKK-JISYO.mazegaki'
  | 'SKK-JISYO.noregist'
  | 'SKK-JISYO.not_wrong'
  | 'SKK-JISYO.notes'
  | 'SKK-JISYO.okinawa'
  | 'SKK-JISYO.pinyin'
  | 'SKK-JISYO.propernoun'
  | 'SKK-JISYO.pubdic+'
  | 'SKK-JISYO.requested'
  | 'SKK-JISYO.station'
  | 'SKK-JISYO.wrong'
  | 'SKK-JISYO.wrong.annotated'

/**
 * SKK 辞書プロバイダ
 */
export class SKKJisyo implements DictionaryProvider {
  /**
   * 辞書の ID
   *
   * SKK-JISYO.hogehoge の形式
   */
  private jid: Name

  /**
   * エントリ
   */
  private entries: Map<string, Candidate[]> | null

  private idb: null

  constructor(name: Name) {
    this.jid = name

    this.entries = null
    this.idb = null
  }

  /**
   * SKK 辞書の名前
   *
   * 辞書 ID の hogehoge の部分
   */
  private get jisyoName() {
    return this.id.slice('SKK-JISYO.'.length)
  }

  get description(): string {
    return `SKK ${this.jisyoName} 辞書 https://skk-dev.github.io/dict/`
  }

  get isEditable(): boolean {
    return false
  }

  get id(): string {
    return this.jid
  }

  get name(): string {
    return `SKK ${this.jisyoName} 辞書`
  }

  get path(): string {
    return `/${this.id}`
  }

  get upstream(): string {
    return `https://skk-dev.github.io/dict/${this.id}.gz`
  }

  public ready(): boolean {
    return this.entries !== null
  }

  public async search(key: string): Promise<Candidate[]> {
    if (this.entries === null) {
      throw new Error('Load the dictionary before using')
    }

    const candidates = this.entries.get(key)

    return (candidates ?? []).slice()
  }

  public async add(
    _key: string,
    _candidate: string,
    _annotation?: string,
  ): Promise<void> {
    throw new Error('This dictionary is read-only')
  }

  public async remove(_key: string, _candidate: string): Promise<void> {
    throw new Error('This dictionary is read-only')
  }

  public async load(): Promise<void> {
    const text = localStorage.getItem(this.id)

    if (!text) {
      await this.update()

      return
    }

    let entries: [string, Candidate[]][] = []
    try {
      entries = JSON.parse(text)
    } catch (e) {
      console.error('Failed to load dictionary', e)
    }

    this.entries = new Map(entries)
  }

  public async save(): Promise<void> {
    if (this.entries === null) {
      throw new Error('Load the dictionary before using')
    }

    localStorage.setItem(this.id, JSON.stringify([...this.entries.entries()]))
  }

  public async update(): Promise<void> {
    const res = await fetch(this.upstream)

    const decoder = new TextDecoder('euc-jp')

    let text: string
    if (res.headers.get('content-type') === 'application/gzip') {
      const inflated = inflate(new Uint8Array(await res.arrayBuffer()))

      text = decoder.decode(inflated)
    } else {
      text = decoder.decode(await res.arrayBuffer())
    }

    const entries = await parse(text)

    this.entries = new Map(entries)

    await this.save()
  }
}
