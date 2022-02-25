import type { SKK } from './skk'

export type Rule = [
  string,
  (
    | [string, string, string]
    | [string, string, string, 'leave-last' | 'look-next']
  ),
][]

export type Table = {
  convertible: string[]
  rule: Rule
}

export type KanaMode = 'hiragana' | 'katakana' | 'halfkana'

export type CandidateTemplate = {
  candidate: string
  id: number
  parentId?: number
  label?: string
  annotation?: string
  usage?: {
    title: string
    body: string
  }
}

export type MenuItem = {
  id: string
  label?: string
  style?: string
  visible?: boolean
  checked?: boolean
  enabled?: boolean
}

export interface SKKContainer {}
export interface SKKContainerConstructor {
  new (skk: typeof SKK): SKKContainer
}
