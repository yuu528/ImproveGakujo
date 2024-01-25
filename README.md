# ImproveGakujo

[静岡大学 学務情報システム](https://gakujo.shizuoka.ac.jp)を改善するユーザスクリプト

## 機能

- 提出期限を色付きで表示
- 未読連絡を色付きで表示
- ブラウザ/マウスの戻るボタンの有効化(ベータ)
- カスタムカラー機能(ベータ)

## 注意

- このユーザスクリプトは静岡大学、NTTデータ及び学務情報システムに関連する一切の団体や個人との関係を持ちません。
- このユーザスクリプトによって起きた損害等について、開発者は一切責任を持ちません。自己責任でご利用ください。

## 動作確認済み環境

このスクリプトは以下の環境でテスト済みです。
動作確認済み環境以外では動作しない可能性があります。

- Windows 11
- Firefox 121.0.1
- Tampermonkey 4.18.1
- 静岡大学 LiveCampus (2024年1月時点)

## インストール

1. ブラウザにユーザスクリプトマネージャをインストールする

- [Tampermonkey (Firefox)](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- 上記以外の環境については動作確認していません

2. improve_gakujo.user.jsをインストールする

- [インストールリンク](https://raw.githubusercontent.com/yuu528/ImproveGakujo/main/improve_gakujo.user.js)

## 使い方

- 提出期限を色付きで表示
  - レポート・小テスト一覧ページなどで、提出期限の近さに応じて自動でセルに色が付きます。
- 未読連絡を色付きで表示
  - 授業連絡一覧ページなどで、未読のセルが赤色になります。
- ブラウザ/マウスの戻るボタンの有効化(ベータ)
  - 戻るボタンを押してもエラーになりません。
  - 一部のページでは適切なページ(前のページなど)に自動的に飛びます。
- カスタムカラー機能(ベータ)
  - 画面カスタマイズページから好きな色を選ぶことができます。
