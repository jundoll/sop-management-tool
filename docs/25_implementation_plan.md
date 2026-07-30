# 実装計画書

## 1. 実施内容

### 1.1 フィードバック6項目の修正

以下の6項目の実装不十分箇所を修正する：

| # | フィードバック項目 | 修正内容 | 対象ファイル |
|---|-------------------|---------|------------|
| 12 | ステップ編集で詳細エリアが閉じてしまう | clickハンドラに `.step-detail` 除外判定を追加 | `js/admin.js` |
| 14 | 保存、キャンセル、削除は横並びに。余計な空白も入れない | detail-actionsのflex:1解除 | `css/styles.css`, `js/admin.js` |
| 15 | 新規ステップ作成時に詳細レベルの内容を入れられるように | 新規ステップ追加時に詳細エリアを自動展開 | `js/admin.js` |
| 16 | 変更が加わったときだけ保存ボタンを有効に | detail-save-btnのdisabled制御を追加 | `js/admin.js` |
| 18 | 「選択画面へ」の問題を見直し | キャンセルボタンの常時表示、確認ダイアログ経由 | `js/app.js` |
| 25 | 各ステップの上側をステップ、下側を実施情報に | 実施画面の上下2段構成レイアウト変更 | `js/player.js`, `css/styles.css` |

## 2. 実装手順

### ステップ1: 詳細エリア開閉制御の修正（#12）
**ファイル**: `js/admin.js`
- 129-142行の step-item click ハンドラを修正
- `e.target.closest('.step-detail')` が存在する場合は toggle をスキップ

### ステップ2: 詳細エリアボタンのflex:1解除（#14）
**ファイル**: `js/admin.js`, `css/styles.css`
- `detail-actions` の `style="flex:1"` を削除し、各ボタンの幅を内容に応じた auto にする
- CSSに `.detail-actions button { flex: none; }` を追加

### ステップ3: 新規ステップ作成時の詳細エリア自動展開（#15）
**ファイル**: `js/admin.js`
- `addStep()` 関数を修正
- `startInlineEdit(newIndex)` の代わりに詳細エリア（step-detail）を自動表示
- `setTimeout` 内で `detailEl.style.display = 'block'` を設定

### ステップ4: 詳細エリア保存ボタンのdisabled制御（#16）
**ファイル**: `js/admin.js`
- `detail-save-btn` に初期状態で `disabled` 属性を追加
- 詳細エリア内の入力変更を検知して enabled に切り替え
- `saveDetailEdit()` 実行後に再度 disabled に戻す
- 変更検知: instruction, comment, evidence_required, evidence_description, images

### ステップ5: キャンセルボタンの常時表示と確認ダイアログ経由（#18）
**ファイル**: `js/app.js`
- `showAdminView()` 内の `cancel-sop-btn` の `display:none` を削除（常時表示）
- `back-to-selection-btn`（作成画面へ）押下時に `confirmUnsavedChanges` を経由する
- `cancel-sop-btn` 押下時は未保存SOPを破棄して選択画面へ戻る

### ステップ6: 実施画面の上下2段構成レイアウト変更（#25）
**ファイル**: `js/player.js`, `css/styles.css`
- `player-step-card` 内のレイアウトを左右2カラムから上下2段に変更
- 上段: 指示内容、参照画像、補足コメント
- 下段: 完了日付・時刻、判定ボタン、作業コメント、スキップ理由入力、エビデンス画像貼り付け
- 関連CSSクラスを追加・修正

## 3. 変更ファイル一覧

### 変更ファイル
- `js/admin.js` - 作成画面の修正（#12, #14, #15, #16）
- `js/app.js` - 作成画面のボタン制御修正（#18）
- `js/player.js` - 実施画面レイアウト変更（#25）
- `css/styles.css` - レイアウト関連CSSの追加・修正（#14, #25）

## 4. 実装優先度

### 優先度高（即時実装）
1. #12 詳細エリア開閉制御の修正
2. #15 新規ステップ作成時の詳細エリア自動展開
3. #16 詳細エリア保存ボタンのdisabled制御

### 優先度中
4. #18 キャンセルボタンの常時表示と確認ダイアログ経由
5. #14 詳細エリアボタンのflex:1解除

### 優先度低
6. #25 実施画面の上下2段構成レイアウト変更

## 5. テスト観点

### 5.1 フィードバック項目の検証
各フィードバック項目について以下を確認：
- 実装が正しく動作するか
- UI/UXが期待通りか
- 既存機能への影響がないか

### 5.2 回帰テスト
- SOP作成・保存・読み込み
- ステップのCRUD操作
- ドラッグ＆ドロップ並び替え
- 実施画面での判定・記録
- Excel出力

### 5.3 ブラウザテスト
- Microsoft Edge最新版での動作確認
- GitHub Pages相当のHTTPS環境での確認

## 6. 検証基準

### 6.1 完了条件
- フィードバック6項目の実装完了
- 既存テストケースの全 Pass
- 手動テストでの動作確認

### 6.2 品質基準
- 構文エラーなし
- ブラウザコンソールエラーなし
- パフォーマンス基準を満たす