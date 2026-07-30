# 実装計画書

## 修正対象：5つのフィードバック未修正項目

### 変更ファイル一覧
- `js/admin.js` - #19, #20, #24, #25
- `js/app.js` - #24
- `css/styles.css` - #19, #25, #30

### 変更なしファイル
- `index.html`
- `js/utils.js`
- `js/player.js`
- `js/excelExport.js`

---

## 実装手順

### Step 1: #24 - SOP保存時のポップアップ2重表示防止

**ファイル:** `js/app.js`

**修正内容:**
- `showAdminView()` 内の `save-sop-btn` に対する click イベントハンドラ登録（451-453行目）を削除する
- `setupEventListeners()` 内のハンドラが唯一の保存処理実行箇所となる

**理由:**
`showAdminView()` が呼ばれるたびに新しい click ハンドラが追加され、`setupEventListeners()` のハンドラと重複することで保存時に alert が2回表示される。

---

### Step 2: #20 - 画像ペーストの確実な動作

**ファイル:** `js/admin.js`

**修正内容:**
- `renderStepsList()` メソッドの末尾で `_attachDetailPasteHandlers()` を呼び出す
- これにより詳細エリア描画後に各画像アップロードエリアにペーストハンドラが確実にアタッチされる

**理由:**
`_attachDetailPasteHandlers` 関数が定義されているが、`setupEventListeners()` 内で定義されたまま一度も実行されていない。`renderStepsList()` の末尾で呼び出すことで、詳細エリア描画後に必ずペーストハンドラがアタッチされる。

---

### Step 3: #19 - ステップ編集時のステップ番号表示維持

**ファイル:** `css/styles.css`

**修正内容:**
- `.step-item.editing` 状態でも `.step-index` が非表示にならないようにCSSを確認・修正する
- 必要に応じて `.step-item.editing .step-index` の明示的な表示ルールを追加する

**ファイル:** `js/admin.js`

**修正内容（確認）:**
- `startInlineEdit` がイベントハンドラから呼ばれていないことを確認し、詳細エリア開閉方式に統一されていることを確認する（現状の動作を維持）

**理由:**
`.step-item.editing` 時に `.step-preview` が `display: none` になるが、`.step-index` は `.step-item-left` 内にあり、引き続き表示される。CSSで明示的に表示を保証する。

---

### Step 4: #25 - 参考画像欄を縦に長くする

**ファイル:** `css/styles.css`

**修正内容:**
- `.step-detail-right` の幅制限を見直す（固定200px → 可変）
- 画像アップロードエリアの最小高さを増やす
- 画像サムネイルグリッドのレイアウトを調整

**ファイル:** `js/admin.js`

**修正内容:**
- 詳細エリア内の画像アップロードエリアのスタイル調整（必要に応じて）

**理由:**
参考画像欄が固定幅200pxで制限されており、縦方向のスペースが十分に活用されていない。

---

### Step 5: #30 - エビデンス貼り付け欄の謎の枠削除

**ファイル:** `css/styles.css`

**修正内容:**
- `player-evidence-area` 内の `image-upload-area` の破線枠（`border: 2px dashed`）を削除する
- `captured-images` の破線枠は維持し、プレースホルダーテキストも維持する

**理由:**
実施画面のエビデンス領域で `image-upload-area`（破線枠）と `captured-images`（破線枠）が入れ子になり、二重枠が表示される。

---

## 実装順序

1. **#24**: 重複ハンドラ削除（`js/app.js`） - 最も影響範囲が大きい
2. **#20**: ペーストハンドラ確実呼び出し（`js/admin.js`） - 機能修正
3. **#19**: ステップ番号表示CSS確認（`css/styles.css`） - 表示確認のみ
4. **#25**: 画像エリア拡大（`css/styles.css` + `js/admin.js`） - レイアウト調整
5. **#30**: 二重枠解消（`css/styles.css`） - レイアウト調整

## ビルド・検証
- ビルド不要（Vanilla JS）
- 各修正後にブラウザで動作確認
- 全修正完了後に統合テスト