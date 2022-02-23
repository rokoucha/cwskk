export type Rule = [
  string,
  (
    | [string, string, string]
    | [string, string, string, 'leave-last' | 'look-next']
  ),
][]
