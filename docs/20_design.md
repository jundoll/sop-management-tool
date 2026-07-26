# 設計書：AI連携型 ステップ形式SOPシステム

## 1. システムアーキテクチャ

### 1.1 全体構成
- **フロントエンドのみ**: Vanilla HTML/CSS/JavaScript (npm非依存)
- **通信**: ネットワーク条件によりSharePointとの連携

### 1.2 ファイル構成
```
sop-management-tool/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── admin.js
│   ├── player.js
│   ├── excelExport.js
│   └── utils.js
└── docs/
```

### 1.3 ブラウザ要件
- Microsoft Edge (最新版) のみ対応

## 2. 画面設計

### 2.1 画面一覧
| 画面ID | 名称 | 目的 | 遷移元 | 遷移先 |
|--------|------|------|--------|--------|
| A-01 | SOP一覧 | 既存SOPの選択、新規作成、JSONインポート | 初期 | A-02, P-01 |
| A-02 | 管理者編集 | ステップCRUD、設定編集、保存 | A-01 | A-01, A-03 |
| A-03 | プレビュー | SOP全体プレビュー | A-02 | A-02 |
| P-01 | 実施開始 | 作業者名入力、実施開始 | A-01 | P-02 |
| P-02 | ステップ実施 | ウィザード形式の作業記録 | P-01 | P-02, P-03 |
| P-03 | 完了・出力 | 実績Excel出力 | P-02 | A-01 |

### 2.2 管理者画面 (A-02)
- ヘッダー: SOPタイトル入力、新規SOPボタン、保存ボタン、プレビュー表示ボタン
- メイン: ステップリスト（ドラッグ&ドロップ並び替え）、追加/削除ボタン
- サイド: 選択ステップの編集フォーム
  - 作業指示文テキストエリア（広めの編集エリア）
  - 補足コメント入力欄
  - 参考画像貼り付け（複数枚）
    - クリップボードからのペーストのみ対応（ファイル選択なし）
  - **設定は常時有効（変更不可）**:
    - 画像プレースホルダー表示（常時ON）
    - 時刻記録必須（常時ON）
    - OK/NG判定必須（常時ON）
    - スキップ許可（常時ON）

### 2.3 実施画面 (P-01/P-02/P-03)
- P-01（開始画面）
  - SOPタイトル表示
  - 作業者名入力欄
  - 開始ボタン

- P-02（ステップ実施）
  - ヘッダー: ステップ番号/全体数 (例: 3/10)
  - メイン: 作業指示文、補足コメント、参考画像（複数枚表示）
  - 入力エリア:
    - 記録ボタン (時刻) - require_timeがONの場合表示
    - OK/NGトグル - require_judgmentがONの場合表示
    - スキップボタン - skip_enabledがONの場合表示
    - 画像添付エリア（複数枚、ペーストのみ）- media_enabledがONの場合表示
    - 作業コメント入力欄
  - フッター: 次へボタン、スキップ理由入力エリア（スキップ押下時表示）
  - 未入力時: 非ブロック型警告モーダル

- P-03（完了画面）
  - 完了メッセージ
  - Excel出力ボタン
  - 管理者一覧へ戻るボタン

### 2.4 選択画面 (A-01)
- 新規SOP作成ボタン
- JSONファイルから読み込みボタン（ファイル選択UI）
- SOP一覧（タイトル、ステップ数、更新日、操作ボタン）

### 2.5 モーダル
- 警告モーダル (非ブロック): 未入力時の注意喚起
- スキップ理由入力: スキップ時テキストエリア
- JSON読み込みエラー: パースエラー表示

## 3. データ設計

### 3.1 テンプレートデータモデル (JSON)
```json
{
  "sop_id": "string (UUID)",
  "sop_title": "string",
  "created_at": "string (ISO8601)",
  "updated_at": "string (ISO8601)",
  "steps": [
    {
      "step_index": "integer (1始まり)",
      "instruction": "string",
      "comment": "string",
      "media_enabled": "boolean",
      "require_time": "boolean",
      "require_judgment": "boolean",
      "skip_enabled": "boolean",
      "images": ["base64_data_url"]
    }
  ]
}
```

### 3.2 実行時データモデル (実績)
```json
{
  "sop_id": "string",
  "sop_title": "string",
  "operator_name": "string",
  "execution_date": "string (YYYYMMDD)",
  "started_at": "string (ISO8601)",
  "completed_at": "string (ISO8601)",
  "steps": [
    {
      "step_index": "integer",
      "instruction": "string",
      "comment": "string",
      "time": "string (HH:mm:ss)",
      "judgment": "OK|NG|未判定",
      "skip": "boolean",
      "skip_reason": "string",
      "images": ["base64_data_url"],
      "operator_comment": "string"
    }
  ]
}
```

### 3.3 ローカルストレージ構造
- `sop_templates`: テンプレート一覧（配列）
- `current_execution`: 実行中データ（進捗復元用）
- `currentSop`: 現在編集中のSOP（単一オブジェクト）

## 4. 技術選定と実装方針

### 4.1 ライブラリ
- **Excel生成**: SheetJS (xlsx) CDN版 (`https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js`)
- **画像処理**: Canvas API (ネイティブ)
- **アニメーション**: CSS Transitions (Vanilla)
- **ID生成**: `crypto.randomUUID()` （Edge対応）

### 4.2 状態管理
- グローバル変数 (`window.app`) で一元管理
- LocalStorage への自動保存（5秒ごと）
- 複数SOPは配列で管理

### 4.3 通信設計
- フロントエンドのみ（SharePoint連携は将来拡張）
- LocalStorage をプライマリストレージとして使用
- エクスポート時はダウンロード（Blob）

### 4.4 画像処理
- **圧縮フロー**:
  1. クリップボードからBlob取得
  2. Imageオブジェクトでデコード
  3. Canvasで最大幅1280pxにリサイズ (アスペクト比保持)
  4. canvas.toBlob('image/jpeg', 0.8) で圧縮
  5. Base64 Data URL文字列に変換
- **配列管理**: 各ステップの `images` 配列に追加
- **複数枚対応**: 配列にpushで追加、UIはサムネイル一覧表示

## 5. アルゴリズム詳細

### 5.1 Excel出力フロー
1. XLSX.utils.book_new() で新規ブック
2. ヘッダー行書き込み (No, 作業内容, 実施時刻, 判定, スキップ理由, コメント, 画像)
3. 各ステップ行をループ
4. 画像がある場合:
   - 画像列を行結合（画像数分の行数）
   - 各画像を個別の行に埋め込み（絶対パス参照禁止、Base64を埋め込み）
   - セルサイズを画像に合わせて調整（width/height設定）
5. フォント設定: 游ゴシック 11pt
6. 罫線: 標準的な細実線
7. XLSX.writeFile() でダウンロード

### 5.2 ドラッグ&ドロップ並び替え
1. dragstart: 対象行のdataTransferにstep_index設定
2. dragover: preventDefault()でドロップ許可、移動場所をハイライト
3. drop: 配列の要素を入れ替え、step_indexを再計算
4. UI即時再描画
5. LocalStorageに自動保存

### 5.3 バグ修正ポイント
- **編集時の複製問題**: 編集対象のstep_indexを特定し、配列内の同じインデックスの要素だけを更新
- **新規SOP保存問題**: 保存ボタン押下時にLocalStorageに配列を保存し、UIをリフレッシュ
- **プレビュー遷移**: SOP全体プレビューを表示（実施画面へ遷移しない）
- **完了後遷移**: A-01（一覧画面）へ遷移

## 6. エラー処理

### 6.1 想定エラー
| エラー | 検知方法 | 処理 |
|--------|----------|------|
| ネットワーク断 | navigator.onLine || fetch error | alert() で警告 |
| JSONパースエラー | try-catch (JSON.parse) | エラー表示、読み込み中断 |
| クリップボード画像取得不可 | catch (navigator.clipboard.read) | エラーメッセージ + 再ペーストを促す |
| Excel生成失敗 | try-catch (XLSX.writeFile) | alert() で通知 |
| LocalStorage満杯 | catch (QuotaExceededError) | 警告表示、不要な古いデータを削除提案 |

### 6.2 未入力チェック
- 各ステップ移動前に入力必須項目確認
- 未入力の場合はモーダル表示 (ブロックしない)
- ユーザーが「次へ」を選択すれば進行可能

## 7. セキュリティ・制約

- HTTPS必須 (clipboard API制約)
- 画像はメモリ保持のみ（LocalStorageにはBase64文字列として保存）
- 外部ライブラリはCDN経由 (xlsx)
- 特殊な権限制御は実装しない（LocalStorageのみのため）

## 8. パフォーマンス目標

- 画面遷移 2秒以内
- Excel生成 5秒以内 (30ステップ)
- 画像ペースト→プレビュー 1秒以内
- LocalStorage自動保存 5秒以内

## 9. 画面遷移図

```
[A-01: SOP一覧] 
    ↓ (新規作成 / 選択 / インポート)
[A-02: 管理者編集]
    ↓ (プレビュー)
[A-03: プレビュー] → A-02
    ↓ (実施開始)
[P-01: 実施開始]
    ↓ (開始ボタン)
[P-02: ステップ実施] → (完了)
[P-03: 完了・出力] → A-01
```

## 10. 実装順序 (Phase 3)

1. js/utils.js (ユーティリティ、画像圧縮、LocalStorage管理)
2. js/excelExport.js (Excel出力、複数画像埋め込み)
3. js/app.js (ルーティング、状態管理、自動保存)
4. js/admin.js (管理者画面、SOP管理、ステップCRUD、複数画像、コメント)
5. js/player.js (実施画面、コメント表示、複数画像添付)
6. index.html (画面構造)
7. css/styles.css (レイアウト、モーダル、ドラッグ&ドロップ、プレビュー用スタイル)
8. 統合テスト・バグ修正
9. README更新

## 11. 実装上の注意点

### 11.1 フィードバック反映項目
1. 参考画像はペーストのみ対応（ファイル選択なし）
2. 各ステップ設定はUIに表示せず常時ON（時刻記録必須、OK/NG判定必須、スキップ許可）
3. 作業指示文の編集エリアを広くする
4. プレビューはSOP全体プレビューを表示（実施画面へ遷移しない）
5. 編集保存時は対象ステップだけを更新（複製バグ修正）
6. 新規SOP保存時にLocalStorageに保存
7. 複数SOP管理（配列形式）
8. 作業実施時コメント欄追加
9. 完了後→A-01一覧画面へ遷移
10. SOP一覧画面(選択画面)にJSONファイルからインポートするUIを追加
11. 実施開始時に作業者名を入力するP-01画面を実装

### 11.2 既存コードの修正方針
- 既存ファイル（index.html, css/styles.css, js/*.js）を読み込み
- バグ修正と機能追加を最小差分で適用
- 後方互換性を維持（データ形式はマイグレーション考慮）