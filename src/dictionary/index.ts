/**
 * 候補
 */
export type Candidate = { candidate: string; annotation?: string }

/**
 * 辞書プロバイダ
 */
export interface DictionaryProvider {
  /**
   * 辞書の説明
   */
  get description(): string

  /**
   * 編集可能かどうか
   */
  get isEditable(): boolean

  /**
   * 辞書の ID
   */
  get id(): string

  /**
   * 辞書の名前
   */
  get name(): string

  /**
   * 辞書の位置
   */
  get path(): string

  /**
   * 辞書の出所
   */
  get upstream(): string

  /**
   * 辞書の状態
   *
   * @returns 状態
   */
  ready(): boolean

  /**
   * 読みからエントリを検索
   *
   * @param key 見出し
   *
   * @returns 見出しに一致した候補
   */
  search(key: string): Promise<Candidate[]>

  /**
   * 新しい候補を追加
   *
   * @param key 見出し
   * @param candidate 候補
   * @param annotation アノテーション
   */
  add(key: string, candidate: string, annotation?: string): Promise<void>

  /**
   * 候補を削除
   *
   * @param key 見出し
   * @param candidate 候補
   */
  remove(key: string, candidate: string): Promise<void>

  /**
   * 辞書をストレージから読み込む
   */
  load(): Promise<void>

  /**
   * 辞書をストレージに保存
   */
  save(): Promise<void>

  /**
   * 辞書を更新
   */
  update(): Promise<void>
}

/**
 * 辞書エンジン
 */
export class DictionaryEngine {
  /**
   * 辞書のプロバイダリスト
   */
  private providers: DictionaryProvider[]

  /**
   * ユーザー辞書
   */
  private user: DictionaryProvider

  /**
   * コンストラクタ
   *
   * @param user ユーザー辞書
   * @param providers 辞書プロバイダ
   */
  constructor(user: DictionaryProvider, providers?: DictionaryProvider[]) {
    if (!user.isEditable) {
      throw new Error('User dictionary must be editable')
    }

    this.user = user

    this.providers = providers ?? []
  }

  /**
   * 辞書をセットアップ
   */
  public async setup() {
    if (!this.user.ready()) {
      await this.user.load()
    }

    for (const provider of this.providers) {
      if (!provider.ready()) {
        await provider.load()
      }
    }
  }

  /**
   * 辞書のリスト
   */
  public get dictionaries() {
    return [this.user, ...this.providers].map(
      ({ name, description, isEditable, path, upstream }) => ({
        description,
        isEditable,
        name,
        path,
        upstream,
      }),
    )
  }

  /**
   * 辞書を更新
   *
   * @param name 対象の辞書の名前
   */
  public async update(name?: string) {
    await Promise.all(
      this.providers
        .filter((p) => name === undefined || p.name === name)
        .map((p) => p.update()),
    )
  }

  /**
   * 辞書を読み込み
   *
   * @param name 対象の辞書の名前
   */
  public async load(name?: string) {
    await Promise.all(
      [this.user, ...this.providers]
        .filter((p) => name === undefined || p.name === name)
        .map((p) => p.load()),
    )
  }

  /**
   * 辞書を保存
   *
   * @param name 対象の辞書の名前
   */
  public async save(name?: string) {
    await Promise.all(
      [this.user, ...this.providers]
        .filter((p) => name === undefined || p.name === name)
        .map((p) => p.save()),
    )
  }

  /**
   * 見出しから候補を検索
   *
   * @param key 見出し
   *
   * @returns 候補一覧
   */
  public async search(key: string): Promise<Candidate[]> {
    // ユーザー辞書の結果を優先
    const candidates = await this.user.search(key)

    // 各辞書から検索
    const results = await Promise.all(
      this.providers.map(async (p, i) => [i, await p.search(key)] as const),
    )
    for (const [_, result] of results.sort((a, b) => a[0] - b[0])) {
      for (const c of result) {
        if (!candidates.some((s) => s.candidate === c.candidate)) {
          candidates.push(c)
        }
      }
    }

    return candidates
  }

  /**
   * ユーザー辞書に候補を追加
   *
   * @param key 見出し
   * @param candidate 候補
   * @param annotation アノテーション
   */
  public async add(key: string, candidate: string, annotation?: string) {
    await this.user.add(key, candidate, annotation)
  }

  /**
   * ユーザー辞書に候補を削除
   *
   * @param key 見出し
   * @param candidate 候補
   */
  public async remove(key: string, candidate: string) {
    await this.user.remove(key, candidate)
  }
}
