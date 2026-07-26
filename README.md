# SOP管理システム

## 概要

AI連携型ステップ形式SOP（標準作業手順書）管理システム。
定型業務の標準化、ヒューマンエラー防止、およびAIによる手順作成・改定の効率化を図るWebアプリケーションです。

## 特徴

- **フロントエンドのみ**: Vanilla HTML/CSS/JavaScript、npm依存なし
- **Excel出力**: 実績データを.xlsx形式でエクスポート
- **画像対応**: 複数枚の参考画像の貼り付け・添付
- **ステップ管理**: ドラッグ＆ドロップによる並び替え
- **ブラウザ**: Microsoft Edge（最新版）のみ対応

## プロジェクト構成

```
sop-management-tool/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js           # ルーティング・状態管理・自動保存
│   ├── admin.js         # 管理者画面 (A-01/A-02/A-03)
│   ├── player.js        # 実施画面 (P-01/P-02/P-03)
│   ├── excelExport.js   # Excel生成ロジック
│   └── utils.js         # ユーティリティ・画像圧縮
├── docs/
│   ├── 00_feedback.md
│   ├── 01_state.md
│   ├── 10_requirements.md
│   ├── 20_design.md
│   └── 40_test_results.md
├── README.md            # 本ファイル（開発者向け）
├── README-DEPLOY.md     # 配布・配置ガイド
└── README-USAGE.md      # 利用者向け操作ガイド
```

## 技術スタック

- **HTML5/CSS3**: モダンレイアウト、アニメーション
- **Vanilla JavaScript (ES6+)**: モジュールパターン、ローカルストレージ管理
- **SheetJS xlsx**: Excel生成 (CDN版 v0.20.1)
- **Canvas API**: 画像リサイズ・圧縮（最大幅1280px、JPEG品質0.8）
- **暗号学的乱数**: `crypto.randomUUID()` によるID生成

## 起動方法

### 開発環境

1. プロジェクトをクローンまたはダウンロード
2. `index.html` をMicrosoft Edgeで直接開く
3. 配布・配置の詳細は `README-DEPLOY.md` を参照

### 実行条件

- **ブラウザ**: Microsoft Edge 最新版（必須）
- **HTTPS**: クリップボードAPI使用のため必須（ローカルファイルは除く）
- **ネットワーク**: 常時オンライン前提（オフライン時のデータ保持は未定義）

## ビルド手順

**ビルド不要**です。
本プロジェクトはVanilla JSで構成されており、npm等のビルドツールを使用しません。
HTML/CSS/JSファイルをWebサーバーに配置するだけで動作します。

## データモデル

### テンプレート（管理者）

```json
{
  "sop_id": "UUID",
  "sop_title": "SOPタイトル",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "steps": [
    {
      "step_index": 1,
      "instruction": "作業指示",
      "comment": "補足コメント",
      "media_enabled": true,
      "require_time": true,
      "require_judgment": true,
      "skip_enabled": true,
      "images": ["base64..."]
    }
  ]
}
```

### 実行時データ（実績）

```json
{
  "sop_id": "UUID",
  "sop_title": "SOPタイトル",
  "operator_name": "担当者名",
  "execution_date": "YYYYMMDD",
  "steps": [
    {
      "step_index": 1,
      "time": "HH:mm:ss",
      "judgment": "OK/NG",
      "skip": false,
      "skip_reason": "",
      "images": ["base64..."],
      "operator_comment": ""
    }
  ]
}
```

## ストレージ

- **プライマリ**: ブラウザLocalStorage（`sop_templates`, `current_execution`）
- **実績出力**: Excelファイル（.xlsx）ダウンロード
- **テンプレート永続化**: SharePointドキュメントライブラリ等（手動アップロード/ダウンロード）

## データ取込み・出力

- **JSONインポート**: 選択画面からJSONファイルを読み込み（`JSONファイルから読み込み`ボタン）
- **JSONエクスポート**: 選択画面からSOPテンプレートをJSONファイルとして保存（`エクスポート`ボタン）

## 機能一覧

### 管理者 (Admin)
- 複数SOPの作成・一覧・選択
- ステップCRUD（追加・編集・削除）
- ドラッグ＆ドロップ並び替え
- 各ステップ設定（常時有効、変更不可）
  - 画像添付許可（常時ON）
  - 時刻記録必須（常時ON）
  - OK/NG判定必須（常時ON）
  - スキップ許可（常時ON）
- 複数画像貼り付け（ペーストのみ）
- SOP全体プレビュー（実施画面には遷移しない）
- SOPテンプレートのJSONエクスポート

### 実施者 (Player)
- ウィザード形式のステップ遷移
- 作業者名入力（実施開始時、P-01）
- 時刻記録（記録ボタン、常時必須）
- OK/NGトグル判定（常時必須）
- 画像添付（複数枚、ペースト/ファイル選択）
- スキップ機能（理由入力必須）
- 作業コメント入力
- 未入力警告（非ブロック型モーダル）
- 完了後Excel出力

## テスト結果

静的検証済み。詳細は `docs/40_test_results.md` を参照。
- 要件定義: `docs/10_requirements.md`
- 設計書: `docs/20_design.md`

## ライセンス

社内利用限定。配布・複製は承認制。