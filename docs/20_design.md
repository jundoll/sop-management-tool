# 基本・詳細設計書

## 1. 設計方針

### 1.1 全体方針
- 既存のVanilla HTML/CSS/JavaScriptアーキテクチャを維持
- フィードバックの影響範囲に限定した最小限の変更
- 既存のレイアウト構成（2カラム）から、編集フォームは全画面または中央モーダル形式に変更
- 既存テストコード・機能は一切変更しない

### 1.2 修正対象のフィードバック
1. **作業編集欄のレイアウト改善**: サイドバー形式から全画面またはモーダル形式に変更
2. **開始ボタンの動作修正**: `navigateTo()` 未実装バグの修正

---

## 2. アーキテクチャ概要

### 2.1 既存構成
```
index.html
├── app-header (ヘッダー)
├── main-content (メインコンテンツ)
│   ├── 選択画面 (A-01)
│   ├── 管理者画面 (A-02)
│   │   ├── ステップ一覧 (左カラム)
│   │   └── 編集フォーム (step-form) ← 右サイドバー ← 【変更対象】
│   └── 実施画面 (P-01, P-02)
└── step-form (編集フォームのサイドバー) ← 【変更対象】
└── modal-overlay (モーダル)
```

### 2.2 修正後構成
```
index.html
├── app-header (ヘッダー)
├── main-content (メインコンテンツ)
│   ├── 選択画面 (A-01)
│   ├── 管理者画面 (A-02)
│   │   ├── ステップ一覧 (左カラム)
│   │   └── 編集フォーム (中央モーダル/全画面オーバーレイ) ← 【変更後】
│   └── 実施画面 (P-01, P-02)
└── modal-overlay (モーダル)
    └── step-form (編集フォームをモーダル内に移動) ← 【変更後】
```

---

## 3. 詳細設計

### 3.1 作業編集欄のレイアウト変更

#### 3.1.1 HTML構造の変更
**対象ファイル**: `index.html`

**変更内容**:
- `step-form` div (25-48行目) を `modal-overlay` 内に移動
- 編集フォームをモーダル形式で表示するよう変更
- モーダル内に十分な横幅と高さを確保

**変更前**:
```html
<!-- Step Form Sidebar (Admin) -->
<div class="step-form" id="step-form">
    <!-- フォーム内容 -->
</div>

<!-- Modals -->
<div class="modal-overlay" id="modal-overlay" style="display:none;">
    <div class="modal-content" id="modal-content"></div>
</div>
```

**変更後**:
```html
<!-- Modals -->
<div class="modal-overlay" id="modal-overlay" style="display:none;">
    <div class="modal-content" id="modal-content">
        <!-- Step Form (モーダル内に配置) -->
        <div class="step-form" id="step-form">
            <!-- フォーム内容 -->
        </div>
    </div>
</div>
```

#### 3.1.2 CSSの変更
**対象ファイル**: `css/styles.css` (新規作成または既存ファイルに追加)

**必要なスタイル**:
- `.step-form` をモーダル内で全幅表示
- textarea の高さを十分に確保（rows 10→20 に増加、またはCSSで高さ指定）
- 編集エリアの横幅を制限しないレイアウト

```css
.step-form {
    width: 100%;
    max-width: 900px;
    padding: 32px;
}

.step-form .form-group textarea {
    width: 100%;
    min-height: 200px;
    font-size: 12pt;
}

#modal-content.step-form-modal {
    max-width: 95vw;
    max-height: 90vh;
    overflow-y: auto;
}
```

#### 3.1.3 JavaScriptの変更
**対象ファイル**: `js/admin.js`

**変更内容**:
- `openStepForm()`: モーダルを表示するよう変更
- `closeStepForm()`: モーダルを非表示にするよう変更
- モーダル制御ロジックを追加

```javascript
openStepForm: function(stepData) {
    // フォームに値を設定
    document.getElementById('step-instruction').value = stepData.instruction || '';
    document.getElementById('step-comment').value = stepData.comment || '';
    this.currentImages = stepData.images || [];
    this.renderImageThumbnails();

    // モーダルを表示
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    
    // step-formをmodal-content内に移动（必要に応じて）
    modalContent.classList.add('step-form-modal');
    modalOverlay.style.display = 'flex';
},

closeStepForm: function() {
    const form = document.getElementById('step-form');
    if (form) {
        form.classList.remove('open');
    }
    
    // モーダルを非表示
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.style.display = 'none';
    
    this.currentStepIndex = null;
}
```

### 3.2 開始ボタンの動作修正

#### 3.2.1 問題の原因
**対象ファイル**: `js/player.js`

**問題箇所**: 64行目
```javascript
this.navigateTo('player-step'); // 未定義メソッドの呼び出し
```

**原因**: `navigateTo()` メソッドが存在しないため、JavaScript実行エラーが発生

#### 3.2.2 修正設計
**修正方針**: `startExecution()` 内の不要な `navigateTo()` 呼び出しを削除し、直接 `renderStep()` を呼び出す

**変更前**:
```javascript
startExecution: function(operatorName) {
    this.previewMode = false;
    this.operatorName = operatorName || '';
    this.currentStepIndex = 0;
    
    // Initialize execution data
    window.app.state.executionData = [];
    window.app.state.currentSop.steps.forEach((step, index) => {
        window.app.state.executionData[index] = {
            time: '',
            judgment: '未判定',
            skip: false,
            skip_reason: '',
            image_base64: null
        };
    });

    this.navigateTo('player-step'); // 【削除対象】
},
```

**変更後**:
```javascript
startExecution: function(operatorName) {
    this.previewMode = false;
    this.operatorName = operatorName || '';
    this.currentStepIndex = 0;
    
    // Initialize execution data
    window.app.state.executionData = [];
    window.app.state.currentSop.steps.forEach((step, index) => {
        window.app.state.executionData[index] = {
            time: '',
            judgment: '未判定',
            skip: false,
            skip_reason: '',
            image_base64: null
        };
    });

    this.renderStep(); // 【追加】直接ステップ画面を表示
},
```

### 3.3 画面遷移フロー（修正後）

#### 3.3.1 管理者画面の操作フロー
1. ステップ一覧から「編集」ボタンクリック
2. `admin.editStep(index)` が呼ばれる
3. `admin.openStepForm(stepData)` がモーダルを表示
4. ユーザーがフォームに入力
5. 「保存」ボタンクリック → `admin.saveStep()` が実行
6. `admin.closeStepForm()` でモーダルを閉じる

#### 3.3.2 作業者画面の操作フロー
1. 作業者名を入力して「開始」ボタンクリック
2. `Player.startExecution(operatorName)` が呼ばれる
3. 実行データを初期化
4. `Player.renderStep()` でステップ1を表示 ← 【修正点】
5. 各ステップで作業を実施
6. 「次へ」ボタンで次のステップへ
7. 全ステップ完了後、完了画面を表示

---

## 4. 非機能要件の充足

### 4.1 パフォーマンス
- モーダル表示はDOM要素の移動のみで、パフォーマンス影響なし
- `navigateTo()` 削除により、関数呼び出しコストが削減

### 4.2 ブラウザ互換性
- モーダル表示は基本的なDOM操作であり、Edgeで問題なく動作

### 4.3 保守性
- 不要な `navigateTo()` メソッドを削除することで、コードの明確性が向上
- モーダル形式により、編集エリアのレスポンシブ対応が容易

---

## 5. 変更ファイル一覧

### 5.1 HTMLファイル
- `index.html`: step-formをmodal-overlay内に移動

### 5.2 CSSファイル
- `css/styles.css`:
  - `.step-form` のスタイル変更
  - モーダル内フォーム用のスタイル追加

### 5.3 JavaScriptファイル
- `js/admin.js`:
  - `openStepForm()` のモーダル表示ロジック変更
  - `closeStepForm()` のモーダル非表示ロジック変更
- `js/player.js`:
  - `startExecution()` から `this.navigateTo()` を削除
  - `this.renderStep()` を追加

---

## 6. テスト観点

### 6.1 正常系
- [ ] ステップ編集ボタンクリックでモーダルが開く
- [ ] モーダル内で作業指示内容が入力できる
- [ ] モーダルが全画面または中央に表示され、横幅が制限されていない
- [ ] 「保存」ボタンでモーダルが閉じ、一覧が更新される
- [ ] 「キャンセル」ボタンでモーダルが閉じ、変更が破棄される
- [ ] 作業者名入力後、「開始」ボタンでステップ1画面に遷移する
- [ ] 遷移後、通常通りステップ進行が動作する

### 6.2 異常系
- [ ] モーダル外クリックでモーダルが閉じる（オプション）
- [ ] Escapeキーでモーダルが閉じる（既存機能）
- [ ] 開始ボタンクリック時にJavaScriptエラーが発生しない

### 6.3 回帰テスト
- [ ] SOP一覧画面が正常に表示される
- [ ] 新規SOP作成が正常に動作する
- [ ] SOP保存が正常に動作する
- [ ] プレビュー機能が正常に動作する
- [ ] ステップのドラッグ＆ドロップ並び替えが正常に動作する
- [ ] 画像ペーストが正常に動作する
- [ ] Excel出力が正常に動作する

---

## 7. リスクと対策

### 7.1 リスク
- モーダル表示により、ユーザーが迷う可能性
- 既存のステップ一覧と編集フォームの連携が崩れる可能性

### 7.2 対策
- モーダルは明確な「保存」「キャンセル」ボタンを表示
- 既存の `currentStepIndex` 管理ロジックは変更しない