export type Rule = [
  string,
  (
    | [string, string, string]
    | [string, string, string, 'leave-last' | 'look-next']
  ),
][]

export type KanaMode = 'hiragana' | 'katakana' | 'halfkana'
