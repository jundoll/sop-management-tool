# SOP管理システム - 配布・配置ガイド

開発者・配布者向けの配置手順です。

## 前提

- 配布対象: SharePoint Online ドキュメントライブラリ、または任意のWebサーバー
- ブラウザ: Microsoft Edge 最新版のみ対応
- HTTPS: クリップボードAPI使用のため、HTTPS配信が必須

## 構成ファイル

```
sop-management-tool/
├── index.html
├── css/styles.css
├── js/
│   ├── app.js
│   ├── admin.js
│   ├── player.js
│   ├── excelExport.js
│   └── utils.js
├── README.md
├── README-DEPLOY.md
└── README-USAGE.md
```

> 注: npm関連ファイルは含まれません。

## 配置手順

### GitHub Pages 等の静的ホスティング

1. 上記フォルダ全体をリポジトリへプッシュ
2. ブランチ `main` または `gh-pages` を指定
3. HTTPS URL でアクセス可能になる

### SharePoint Online

1. ドキュメントライブラリへ `sop-management-tool` フォルダを作成
2. 上記ファイルをすべてアップロード
3. ファイルの共有設定を調整
4. `index.html` の直接リンクを参加者へ共有

## 動作確認

- Edge (最新版) で index.html を開く
- 管理者画面でSOPテンプレートを読み込めることを確認
- 実施画面で動作確認

## 既知の制約

- 通信断時にデータ保持は未実装
- オフライン環境では画像ペーストが動作しない
- ローカルファイル(``file://``)ではクリップボードAPIが制限される場合があります