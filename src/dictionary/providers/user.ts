import { Candidate, DictionaryProvider } from '../index'

/**
 * ユーザー辞書プロバイダ
 */
export class UserJisyo implements DictionaryProvider {
  /**
   * エントリ
   */
  private entries: Map<string, Candidate[]> | null

  constructor() {
    this.entries = null
  }

  get description(): string {
    return 'ユーザー辞書'
  }

  get isEditable(): boolean {
    return true
  }

  get id(): string {
    return 'USER'
  }

  get name(): string {
    return `ユーザー辞書`
  }

  get path(): string {
    return `/localStorage/user`
  }

  get upstream(): string {
    return ''
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
    key: string,
    candidate: string,
    annotation?: string,
  ): Promise<void> {
    if (this.entries === null) {
      throw new Error('Load the dictionary before using')
    }

    const candidates = this.entries.get(key) ?? []

    const i = candidates.findIndex((c) => c.candidate === candidate)

    if (i >= 0) {
      candidates.splice(i, 1)
    }

    candidates.unshift({ candidate, annotation })

    this.entries.set(key, candidates)

    await this.save()
  }

  public async remove(key: string, candidate: string): Promise<void> {
    if (this.entries === null) {
      throw new Error('Load the dictionary before using')
    }

    const candidates = this.entries.get(key)

    if (!candidates) {
      return
    }

    if (candidates.length === 0) {
      this.entries.delete(key)

      return
    }

    this.entries.set(
      key,
      candidates.filter((c) => c.candidate !== candidate),
    )

    await this.save()
  }

  public async load(): Promise<void> {
    const text = localStorage.getItem(this.id)

    if (!text) {
      this.entries = new Map()

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

  public async update(): Promise<void> {}
}
