// Player View Module for SOP Management System

const Player = {
    currentStepIndex: 0,
    previewMode: false,
    operatorName: '',

    // Initialize player view
    init: function() {
        this.currentStepIndex = 0;
        this.previewMode = false;
        this.renderStep();
        this.setupEventListeners();
    },

    // Start preview mode (whole SOP preview)
    startPreview: function() {
        this.previewMode = true;
        this.currentStepIndex = 0;
        this.renderPreview();
    },

    // Show start screen (P-01)
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
    },

    // Start execution
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

        this.renderStep();
    },

    // Render whole SOP preview
    renderPreview: function() {
        const main = document.getElementById('main-content');
        const sop = window.app.state.currentSop;

        const stepsHtml = sop.steps.map((step, index) => `
            <div class="preview-step">
                <div class="preview-step-header">
                    <span class="step-number">ステップ ${index + 1}</span>
                </div>
                <div class="preview-step-body">
                    <div class="instruction">${this.escapeHtml(step.instruction)}</div>
                    ${step.comment ? `<div class="comment">${this.escapeHtml(step.comment)}</div>` : ''}
                    ${step.images && step.images.length > 0 ? `
                        <div class="reference-images">
                            ${step.images.map((img, idx) => `
                                <img src="${img}" class="reference-image" alt="参考画像${idx + 1}">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        main.innerHTML = `
            <div class="preview-container">
                <div class="preview-header">
                    <h2>${this.escapeHtml(sop.sop_title)}</h2>
                    <p class="preview-summary">合計 ${sop.steps.length} ステップ</p>
                </div>
                <div class="preview-steps">
                    ${stepsHtml}
                </div>
                <div class="preview-footer">
                    <button class="secondary" onclick="app.showAdminView()">戻る</button>
                </div>
            </div>
        `;
    },

    // Render current step
    renderStep: function() {
        const main = document.getElementById('main-content');
        const sop = window.app.state.currentSop;
        const step = sop.steps[this.currentStepIndex];
        const stepData = window.app.state.executionData[this.currentStepIndex] || {};
        const totalSteps = sop.steps.length;

        if (!step) {
            this.renderComplete();
            return;
        }

        const isLastStep = this.currentStepIndex === totalSteps - 1;

        main.innerHTML = `
            <div class="player-container">
                <div class="player-header">
                    <h2>${this.escapeHtml(sop.sop_title)}</h2>
                    <div class="step-counter">${this.currentStepIndex + 1} / ${totalSteps}</div>
                </div>
                
                <div class="step-content">
                    <div class="instruction">
                        ${this.escapeHtml(step.instruction)}
                    </div>

                    ${step.comment ? `
                        <div class="comment-section">
                            <label>補足コメント:</label>
                            <div style="background:#f5f5f5;padding:12px;border-radius:4px;border-left:4px solid #0078d4;">
                                ${this.escapeHtml(step.comment)}
                            </div>
                        </div>
                    ` : ''}

                    ${step.images && step.images.length > 0 ? `
                        <div class="reference-images">
                            ${step.images.map((img, idx) => `
                                <img src="${img}" class="reference-image" alt="参考画像${idx + 1}">
                            `).join('')}
                        </div>
                    ` : ''}

                    <div class="input-section">
                        <div class="input-row">
                            <label>完了時刻:</label>
                            <button class="secondary" id="record-time-btn">記録</button>
                            <span id="time-display">${stepData.time || '未記録'}</span>
                        </div>

                        <div class="input-row">
                            <label>判定:</label>
                            <div class="toggle-group">
                                <button class="toggle-btn ${stepData.judgment === 'OK' ? 'selected' : ''}" data-value="OK">OK</button>
                                <button class="toggle-btn ${stepData.judgment === 'NG' ? 'selected' : ''}" data-value="NG">NG</button>
                            </div>
                        </div>

                    <div class="input-row">
                        <label>作業画像:</label>
                        <button class="secondary" id="paste-img-btn">ペースト</button>
                    </div>
                        <div id="captured-images" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                            ${(stepData.images || []).map((img, idx) => `
                                <img src="${img}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:1px solid #ddd;">
                            `).join('')}
                        </div>

                        <div class="input-row" style="margin-top:12px;">
                            <label>作業コメント:</label>
                        </div>
                        <textarea id="operator-comment" placeholder="作業記録を入力" rows="3">${stepData.comment || ''}</textarea>
                    </div>
                </div>

                <div class="player-footer">
                    <button class="secondary" onclick="Player.prevStep()" ${this.currentStepIndex === 0 ? 'disabled' : ''}>
                        戻る
                    </button>
                    
                    <button class="btn-skip" onclick="Player.skipStep()">スキップ</button>

                    <button onclick="Player.nextStep()">
                        ${isLastStep ? '完了' : '次へ'}
                    </button>
                </div>
            </div>
        `;

        this.setupPlayerEvents(step);
    },

    // Setup player view event listeners
    setupPlayerEvents: function(step) {
        // Time recording
        const timeBtn = document.getElementById('record-time-btn');
        if (timeBtn) {
            timeBtn.addEventListener('click', () => {
                const time = Utils.formatTime();
                window.app.state.executionData[this.currentStepIndex].time = time;
                document.getElementById('time-display').textContent = time;
            });
        }

        // Judgment toggle
        const toggleBtns = document.querySelectorAll('.toggle-btn');
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                window.app.state.executionData[this.currentStepIndex].judgment = btn.dataset.value;
            });
        });

        // Image paste (multiple images)
        if (step.media_enabled) {
            const playerArea = document.querySelector('.player-container');
            Utils.handlePaste(playerArea, 1280, 0.8, (base64) => {
                this.addExecutionImage(base64);
            });
        }

        // Comment input
        const commentArea = document.getElementById('operator-comment');
        if (commentArea) {
            commentArea.addEventListener('input', (e) => {
                if (!window.app.state.executionData[this.currentStepIndex]) {
                    window.app.state.executionData[this.currentStepIndex] = {};
                }
                window.app.state.executionData[this.currentStepIndex].comment = e.target.value;
            });
        }

        // Next button validation
        const nextBtn = document.querySelector('.player-footer button:last-child');
        if (nextBtn && !this.previewMode) {
            nextBtn.addEventListener('click', (e) => {
                // Non-blocking warning for missing required fields
                const stepData = window.app.state.executionData[this.currentStepIndex];
                let warnings = [];
                
                if (step.require_time && !stepData.time) {
                    warnings.push('時刻が記録されていません');
                }
                if (step.require_judgment && stepData.judgment === '未判定') {
                    warnings.push('判定が選択されていません');
                }

                if (warnings.length > 0) {
                    if (!confirm(warnings.join('\n') + '\n\n未入力のまま次に進みますか？')) {
                        return;
                    }
                }
            });
        }
    },

    // Go to next step
    nextStep: function() {
        const sop = window.app.state.currentSop;
        
        if (this.currentStepIndex < sop.steps.length - 1) {
            this.currentStepIndex++;
            this.renderStep();
        } else {
            this.renderComplete();
        }
    },

    // Go to previous step
    prevStep: function() {
        if (this.currentStepIndex > 0) {
            this.currentStepIndex--;
            this.renderStep();
        }
    },

    // Add execution image
    addExecutionImage: function(base64) {
        if (!window.app.state.executionData[this.currentStepIndex]) {
            window.app.state.executionData[this.currentStepIndex] = {};
        }
        if (!window.app.state.executionData[this.currentStepIndex].images) {
            window.app.state.executionData[this.currentStepIndex].images = [];
        }
        window.app.state.executionData[this.currentStepIndex].images.push(base64);
        this.renderExecutedImages();
    },

    // Render executed images
    renderExecutedImages: function() {
        const container = document.getElementById('captured-images');
        if (!container) return;

        const images = window.app.state.executionData[this.currentStepIndex].images || [];
        container.innerHTML = images.map((img, idx) => `
            <img src="${img}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:1px solid #ddd;">
        `).join('');
    },

    // Skip current step
    skipStep: function() {
        const step = window.app.state.currentSop.steps[this.currentStepIndex];
        
        Utils.showModal('スキップ', 'スキップ理由を入力してください:', [
            { text: 'キャンセル', action: 'cancel', class: 'secondary' },
            { text: 'スキップ実行', action: 'skip', class: 'primary' }
        ]);

        // Override modal button behavior
        const skipBtn = document.querySelector('[data-action="skip"]');
        if (skipBtn) {
            skipBtn.onclick = () => {
                const textarea = document.querySelector('#modal-content textarea');
                const reasonInput = document.querySelector('#modal-content input');
                const reason = (textarea ? textarea.value : '') || (reasonInput ? reasonInput.value : '') || '理由なし';
                
                Utils.hideModal();
                
                const stepData = window.app.state.executionData[this.currentStepIndex];
                stepData.skip = true;
                stepData.skip_reason = reason.trim();

                this.nextStep();
            };
        }
    },

    // Render completion screen
    renderComplete: function() {
        const main = document.getElementById('main-content');
        const sop = window.app.state.currentSop;
        const executionData = ExcelExport.generateExecutionData(sop, this.operatorName);

        main.innerHTML = `
            <div class="player-container">
                <div class="player-header">
                    <h2>${this.escapeHtml(sop.sop_title)}</h2>
                </div>
                
                <div class="step-content" style="text-align: center; padding: 40px 0;">
                    <h3 style="color: #107c10; margin-bottom: 16px;">完了</h3>
                    <p style="margin-bottom: 24px;">全てのステップが完了しました。</p>
                    <p style="color: #666; margin-bottom: 32px;">実績データをExcel出力できます。</p>
                </div>

                <div class="player-footer" style="justify-content: center;">
                    <button class="secondary" onclick="app.showAdminView()">管理者画面へ</button>
                    <button onclick="Player.exportExcel()">Excel出力</button>
                </div>
            </div>
        `;

        // Store execution data for export
        window.app.state.pendingExport = executionData;
    },

    // Export to Excel
    exportExcel: function() {
        const sop = window.app.state.currentSop;
        const executionData = window.app.state.pendingExport;

        if (!executionData) {
            alert('エクスポートするデータがありません。');
            return;
        }

        const result = ExcelExport.exportToExcel(sop, executionData);
        
        if (result.success) {
            alert('Excelファイルを出力しました: ' + result.filename);
        } else {
            alert('Excel出力に失敗しました: ' + result.error);
        }
    },

    // Escape HTML
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Make Player globally accessible
window.Player = Player;