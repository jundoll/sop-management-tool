# 実装計画書：AI連携型 ステップ形式SOPシステム

## 1. 目的

フィードバックに基づく未実装機能（JSONインポートUI、P-01作業者名入力画面）の実装計画を定義する。

## 2. 対象フィードバック

- 選択画面にJSONファイルからインポートするUI/機能を追加してください
- 実施開始時に作業者名を入力する画面（P-01）を実装してください

## 3. 変更対象ファイル

| ファイル | 変更内容 | 理由 |
|---------|---------|------|
| index.html | インポートUI追加、P-01画面のHTML構造追加 | UI要素の追加 |
| js/app.js | showSelectionView修正、P-01画面表示ロジック追加 | インポート処理、P-01遷移 |
| js/player.js | P-01画面の実装、作業者名入力画面の描画 | P-01画面の新規作成 |
| docs/20_design.md | 画面設計の更新 | 設計反映 |

## 4. 実装手順

### 4.1 index.html

1. 選択画面(A-01)に「JSONファイルから読み込み」ボタンを追加
2. P-01画面用のコンテナ要素を追加（初期は非表示）

### 4.2 js/app.js

1. showSelectionView関数を修正
   - 「JSONファイルから読み込み」ボタンのクリックイベント追加
   - ファイル選択ダイアログを表示し、handleFileUploadを呼び出す
2. 新規関数 `showPlayerStartView(sop)` を追加
   - P-01画面を表示する
   - SOPタイトル、作業者名入力欄、開始ボタンを描画
3. `executeSop`関数を修正
   - 現在は直接Player.startExecution()を呼んでいる
   - 新規に`showPlayerStartView(sop)`を呼び出すように変更

### 4.3 js/player.js

1. 新規関数 `startExecution(operatorName)` を追加（既存のstartExecutionと統合）
   - P-01画面で入力された作業者名を保存
   - 実行データを初期化
   - P-02画面へ遷移
2. 新規関数 `showStartScreen(sop)` を追加
   - P-01画面のHTMLを生成して描画
   - 作業者名入力欄と開始ボタンを表示
   - 開始ボタンクリック時に`startExecution(operatorName)`を呼び出す

## 5. 実装詳細

### 5.1 app.js - showSelectionView修正

- 既存の「JSONファイルから読み込み」ボタンとファイル入力はすでに実装済み
- `handleFileUpload` も既に実装済み
- 変更不要（機能は存在する）

### 5.2 app.js - executeSop修正

変更前：
```javascript
executeSop: function(sopId) {
    ...
    this.state.currentSop = Utils.deepClone(sop);
    Player.startExecution();
}
```

変更後：
```javascript
executeSop: function(sopId) {
    ...
    this.state.currentSop = Utils.deepClone(sop);
    Player.showStartScreen(this.state.currentSop);
}
```

### 5.3 player.js - 新規関数

```javascript
showStartScreen: function(sop) {
    const main = document.getElementById('main-content');
    
    main.innerHTML = `
        <div class="player-container">
            <div class="player-header">
                <h2>${this.escapeHtml(sop.sop_title)}</h2>
            </div>
            <div class="step-content" style="text-align:center;padding:40px 0;">
                <div class="form-group">
                    <label for="operator-name">作業者名</label>
                    <input type="text" id="operator-name" placeholder="作業者名を入力" style="width:80%;max-width:400px;padding:12px;font-size:12pt;">
                </div>
            </div>
            <div class="player-footer" style="justify-content:center;">
                <button class="secondary" onclick="app.showSelectionView()">戻る</button>
                <button onclick="Player.startExecution(document.getElementById('operator-name').value)">開始</button>
            </div>
        </div>
    `;
}
```

## 6. CSS調整

- P-01画面のスタイルは既存のplayer-container等を流用するため、新規CSSは不要
- 必要に応じてindex.htmlのstyle属性で調整

## 7. 検証観点

- 選択画面で「実施」ボタンをクリックするとP-01画面が表示されること
- P-01で作業者名を入力して開始ボタンをクリックするとP-02に遷移すること
- P-01で空欄のまま開始をクリックした場合の挙動（現状は空文字列で進行）
- JSONインポートUIが既存のままで機能すること（再確認）
- 既存の保存・プレビュー・ステップCRUDが影響を受けないこと

## 8. リグレッション確認

- 管理者画面の保存、プレビュー、ステップ追加/削除/並び替え
- 実施画面のステップ遷移、時刻記録、判定、スキップ、コメント入力
- Excel出力機能
- localStorageの読み書き