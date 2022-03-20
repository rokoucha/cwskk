# CWSKK

Coward SKK (Simple Kana to Kanji conversion program)

ChromeOS 向けのウェブ技術による SKK 実装、誠意開発中。

<https://cwskk.pages.dev/> で試せます。

## ビルド方法

1. リポジトリをクローン: `git clone https://github.com/rokoucha/cwskk.git` して `cd cwskk`
2. 依存をインストール: `yarn`
3. ビルド:
   - 通常のビルド: `yarn run build`
   - 変更を監視し自動ビルド: `yarn run watch`
   - 自動ビルドしつつ結果を HTTP サーバーで配信: `yarn run serve`

## LICENSE

Copyright (c) 2022 Rokoucha

Released under the MIT license, see LICENSE.

`/src/rules/ascii.ts` 及び `/src/rules/romaji.ts` については CorvusSKK の `/imcrvcnf/convtable.cpp` より改変、作成元ファイルは MIT License。

https://github.com/nathancorvussolis/corvusskk/blob/c8b835472614199afcef31f9e34e5b93c88273d6/imcrvcnf/convtable.cpp
