# 実装計画書

## 1. 実装概要

### 1.1 目的
フィードバック2件を最小限の変更で実装する。

### 1.2 対象フィードバック
1. 作業編集欄が狭い问题の修正
2. 作業者名指定後の開始ボタンが動作しない問題の修正

---

## 2. 実装手順

### 2.1 ステップ1: HTML構造の変更
**ファイル**: `index.html`

**変更内容**:
- `step-form` (25-48行目) を `modal-overlay` 内の `modal-content` に移動
- 編集フォームをモーダル内に配置

**変更前**:
```html
<div class="step-form" id="step-form">
    <!-- フォーム内容 -->
</div>

<div class="modal-overlay" id="modal-overlay" style="display:none;">
    <div class="modal-content" id="modal-content"></div>
</div>
```

**変更後**:
```html
<div class="modal-overlay" id="modal-overlay" style="display:none;">
    <div class="modal-content" id="modal-content">
        <div class="step-form" id="step-form">
            <!-- フォーム内容 -->
        </div>
    </div>
</div>
```

### 2.2 ステップ2: CSSの変更
**ファイル**: `css/styles.css` (新規作成または既存ファイルを読み込み)

**変更内容**:
- `.step-form` のスタイル追加
- textarea の高さを拡張
- モーダル用のスタイル追加（必要に応じて）

**追加CSS**:
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

### 2.3 ステップ3: JavaScript - admin.jsの修正
**ファイル**: `js/admin.js`

**変更内容**:
- `openStepForm()`: モーダルを表示するロジックに変更
- `closeStepForm()`: モーダルを非表示にするロジックに変更

**修正前 (openStepForm)**:
```javascript
openStepForm: function(stepData) {
    document.getElementById('step-instruction').value = stepData.instruction || '';
    document.getElementById('step-comment').value = stepData.comment || '';
    this.currentImages = stepData.images || [];
    this.renderImageThumbnails();
    form.classList.add('open');
}
```

**修正後 (openStepForm)**:
```javascript
openStepForm: function(stepData) {
    document.getElementById('step-instruction').value = stepData.instruction || '';
    document.getElementById('step-comment').value = stepData.comment || '';
    this.currentImages = stepData.images || [];
    this.renderImageThumbnails();

    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    modalContent.classList.add('step-form-modal');
    modalOverlay.style.display = 'flex';
}
```

**修正前 (closeStepForm)**:
```javascript
closeStepForm: function() {
    const form = document.getElementById('step-form');
    if (form) {
        form.classList.remove('open');
    }
    this.currentStepIndex = null;
}
```

**修正後 (closeStepForm)**:
```javascript
closeStepForm: function() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.style.display = 'none';
    this.currentStepIndex = null;
}
```

### 2.4 ステップ4: JavaScript - player.jsの修正
**ファイル**: `js/player.js`

**変更内容**:
- `startExecution()` から `this.navigateTo('player-step');` を削除
- 代わりに `this.renderStep();` を追加

**修正前**:
```javascript
startExecution: function(operatorName) {
    this.previewMode = false;
    this.operatorName = operatorName || '';
    this.currentStepIndex = 0;
    
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

    this.navigateTo('player-step'); // 【削除】未定義メソッド
}
```

**修正後**:
```javascript
startExecution: function(operatorName) {
    this.previewMode = false;
    this.operatorName = operatorName || '';
    this.currentStepIndex = 0;
    
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
}
```

---

## 3. 実装順序

1. **index.html** - step-formをmodal-overlay内に移動
2. **css/styles.css** - モーダル用スタイルを追加
3. **js/admin.js** - openStepForm/closeStepFormをモーダル制御に変更
4. **js/player.js** - navigateTo()呼び出しを削除し、renderStep()を追加

---

## 4. 検証手順

### 4.1 静的検証
- HTML/CSS/JSの構文エラー確認
- ブラウザの開発者ツールでコンソールエラー確認

### 4.2 動作確認
1. SOP一覧画面を表示
2. 「編集」ボタンをクリック → モーダルが開くことを確認
3. モーダルが全画面/中央に表示されることを確認
4. 作業指示内容入力欄が広いことを確認
5. 「保存」ボタンクリック → モーダルが閉じることを確認
6. 「キャンセル」ボタンクリック → モーダルが閉じることを確認
7. 「実施」ボタンクリック → 作業者名入力画面を表示
8. 作業者名を入力して「開始」ボタンクリック → ステップ1画面に遷移することを確認
9. JavaScriptエラーが発生しないことを確認

---

## 5. ロールバック計画

問題が発生した場合:
1. Gitでコミット済みの状態に戻す
2. 変更箇所を特定し、部分的な修正を実施

## 6. 所要時間見積もり

- 実装: 30分
- 検証: 15分
- 合計: 45分