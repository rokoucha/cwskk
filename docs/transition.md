# 状態遷移

TODO: あとで図を書く

## 入力モード間

入力モードの切り替えは以下の状態でのみ可能。

- direct
- conversion

### ひらがな

- `q`: 全角カタカナへ
- `Ctrl-Q`: 半角ｶﾀｶﾅへ
- `l`: 半角英数へ
- `Shift-L`: 全角英数へ

### 全角カタカナ

- `Ctrl-J`: ひらがなへ
- `q`: ひらがなへ
- `Ctrl-Q`: 半角ｶﾀｶﾅへ
- `l`: 半角英数へ
- `Shift-L`: 全角英数へ

### 半角ｶﾀｶﾅ

- `Ctrl-J`: ひらがなへ
- `q`: カタカナへ
- `Ctrl-Q`: ひらがなへ
- `l`: 半角英数へ
- `Shift-L`: 全角英数へ

### 半角英数

- `Ctrl-J`: ひらがなへ

### 全角英数

- `Ctrl-J`: ひらがなへ

## SKK の状態

### direct

- Shift を押しながら打鍵: conversion へ

### conversion

読みや送りが未確定文字となる。

- Enter: 未確定文字を確定して direct へ
- Shift を押しながら打鍵:
  - まだ読みが 1 文字も入力されていない: Shift を無視して続行
  - 読みが 1 文字以上入力されている: candidate-select へ
- Esc or Ctrl-G: 未確定文字を全消去して direct へ

### candidate-select

プリエディトに表示中の候補が選択中となる。

- Enter: 選択中の候補で確定して direct へ
- Space:
  - 候補ウィンドウが非表示: 次の候補へ
  - 候補ウィンドウを表示中: 次の候補ページへ
  - 次の候補がない: registration へ (未実装)
- Delete: 選択中の候補を削除するか尋ねる (未実装)
- asdfjkl:
  - 候補ウィンドウを表示中でラベルにマッチする候補がある: その候補で確定して direct へ、打鍵は引き継がない
  - 候補ウィンドウが非表示またはラベルにマッチする候補がなかった: 選択中の候補で確定して direct へ、打鍵を引き継ぐ
- その他一般キー: 選択中の候補で確定して direct へ、打鍵を引き継ぐ
- Esc or Ctrl-G: 未確定文字をそのままにして conversion へ

### registration (未実装)

基本的には子の SKK に打鍵を流し、結果を合成して表示する。

- 子が確定: 確定文字列を辞書に登録しつつ確定して direct へ
- 子がキャンセル: candidate-select へ