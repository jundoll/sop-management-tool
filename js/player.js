// Player View Module for SOP Management System

const Player = {
    currentStepIndex: 0,
    previewMode: false,

    // Initialize player view
    init: function() {
        this.currentStepIndex = 0;
        this.previewMode = false;
        this.renderSteps();
        this.setupEventListeners();
    },

    // Show start screen (no operator name input)
    showStartScreen: function(sop) {
        const main = document.getElementById('main-content');
        
        main.innerHTML = `
            <div class="player-container">
                <div class="player-header">
                    <h2>${this.escapeHtml(sop.sop_title)}</h2>
                </div>
                <div class="step-content" style="text-align:center;padding:40px 0;">
                    <p style="font-size:12pt;color:var(--gray-500);margin-bottom:24px;">全${sop.steps.length}ステップの作業を実施します。</p>
                </div>
                <div class="player-footer" style="justify-content:center;">
                    <button class="secondary" onclick="app.showSelectionView()">戻る</button>
                    <button onclick="Player.startExecution()">開始</button>
                </div>
            </div>
        `;
    },

    // Start execution
    startExecution: function() {
        this.previewMode = false;
        this.currentStepIndex = 0;
        
        // Initialize execution data
        window.app.state.executionData = [];
        window.app.state.currentSop.steps.forEach((step, index) => {
            window.app.state.executionData[index] = {
                datetime: '',
                judgment: '未判定',
                skip: false,
                skip_reason: '',
                images: [],
                comment: ''
            };
        });

        // Save execution state for reload resilience
        this.saveExecutionState();

        this.renderSteps();
    },

    // Save execution state for reload resilience
    saveExecutionState: function() {
        try {
            const execState = {
                sop_id: window.app.state.currentSop.sop_id,
                currentStepIndex: this.currentStepIndex,
                data: window.app.state.executionData
            };
            localStorage.setItem('execution_data', JSON.stringify(execState));
        } catch (e) {
            console.warn('Failed to save execution state:', e);
        }
    },

    // Render all steps in one scrollable view
    renderSteps: function() {
        const main = document.getElementById('main-content');
        const sop = window.app.state.currentSop;
        const totalSteps = sop.steps.length;

        if (totalSteps === 0) {
            this.renderComplete();
            return;
        }

        // Check if all steps are completed
        const allCompleted = window.app.state.executionData.every(d => d.judgment !== '未判定' || d.skip);
        if (allCompleted) {
            this.renderComplete();
            return;
        }

        const stepsHtml = sop.steps.map((step, index) => {
            const stepData = window.app.state.executionData[index] || {};
            const isCompleted = stepData.judgment !== '未判定' || stepData.skip;
            
            return `
                <div class="player-step-card" data-step-index="${index}">
                    <div class="player-step-header">
                        <span class="step-number">ステップ ${index + 1}</span>
                        ${isCompleted ? '<span class="step-completed-badge">完了</span>' : ''}
                    </div>
                    <div class="player-step-row">
                        <div class="player-step-left">
                            <div class="player-step-top">
                                <div class="instruction" style="font-size:12pt;padding:12px;margin-bottom:8px;">
                                    ${this.escapeHtml(step.instruction)}
                                </div>

                                ${step.images && step.images.length > 0 ? `
                                    <div style="margin-bottom:8px;">
                                        <label style="font-size:10pt;font-weight:600;color:var(--gray-500);display:block;margin-bottom:4px;">参照画像:</label>
                                        <img src="${step.images[0]}" class="reference-image" style="max-width:240px;max-height:180px;border-radius:var(--radius);border:1px solid var(--border-color);cursor:pointer;" onclick="Player.openMediaPreview('${step.images[0]}')">
                                    </div>
                                ` : ''}

                                ${step.comment ? `
                                    <div style="color:var(--gray-500);font-size:10pt;background:var(--gray-50);padding:8px;border-radius:var(--radius-sm);border-left:3px solid var(--primary);">
                                        ${this.escapeHtml(step.comment)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="player-step-right">
                            <div class="input-section" style="margin-bottom:0;">
                                <div style="margin-bottom:8px;">
                                    <label style="font-size:10pt;font-weight:600;color:var(--gray-700);display:block;margin-bottom:4px;">完了日付・時刻</label>
                                    <span class="datetime-display" style="font-size:10pt;">${stepData.datetime || '（未記録）'}</span>
                                </div>

                                    <div style="margin-bottom:8px;">
                                     <label style="display:block;font-size:10pt;font-weight:600;color:var(--gray-700);margin-bottom:4px;">判定</label>
                                     <div style="display:flex;gap:4px;">
                                         <button class="toggle-btn" data-step="${index}" data-value="ok" style="flex:1;padding:8px 12px;font-size:10pt;">OK</button>
                                         <button class="toggle-btn" data-step="${index}" data-value="ng" style="flex:1;padding:8px 12px;font-size:10pt;">NG</button>
                                         <button class="toggle-btn btn-skip" data-step="${index}" data-value="skip" style="flex:1;padding:8px 12px;font-size:10pt;">スキップ</button>
                                     </div>
                                 </div>

                                <div class="skip-reason-section" style="display:none;" id="skip-reason-${index}">
                                    <label style="font-size:10pt;">スキップ理由</label>
                                    <textarea id="skip-reason-text-${index}" rows="2" style="width:100%;font-size:10pt;padding:6px;" placeholder="スキップ理由を入力"></textarea>
                                    <div class="skip-error" style="display:none;"></div>
                                </div>

                                <div style="margin-top:8px;">
                                    <label style="display:block;font-size:10pt;font-weight:600;color:var(--gray-700);margin-bottom:4px;">作業コメント</label>
                                    <textarea class="execution-comment" data-index="${index}" rows="2" style="width:100%;font-size:10pt;padding:6px;" placeholder="作業コメントを入力">${stepData.comment || ''}</textarea>
                                </div>

                                <div style="margin-top:8px;">
                                    <label style="display:block;font-size:10pt;font-weight:600;color:var(--gray-700);margin-bottom:4px;">エビデンス画像</label>
                                    <div class="player-evidence-area">
                                        <div class="image-upload-area evidence-upload" data-step="${index}" style="min-height:auto;padding:8px;">
                                            <div class="paste-hint" style="font-size:9pt;">Ctrl+V で貼り付け</div>
                                            <div class="captured-images" id="evidence-images-${index}"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        main.innerHTML = `
            <div class="player-container" style="max-width:1100px;">
                <div class="player-header">
                    <h2>${this.escapeHtml(sop.sop_title)}</h2>
                    <div class="step-counter">${totalSteps} ステップ</div>
                </div>
                
                <div class="player-all-steps">
                    ${stepsHtml}
                </div>

                <div class="player-footer" style="justify-content:center;">
                    <button class="secondary" onclick="app.showSelectionView()">TOP画面へ</button>
                </div>
            </div>
        `;

        // Render evidence images and setup events after DOM update
        setTimeout(() => {
            sop.steps.forEach((step, index) => {
                Player.renderEvidenceImages(index);
            });
            this.attachPlayerEvents();
        }, 0);
    },

    // Setup player view event listeners
    attachPlayerEvents: function() {
        // Judgment buttons - single handler via data-value attribute
        document.querySelectorAll('.player-step-card .toggle-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const stepIndex = parseInt(this.dataset.step);
                const value = this.dataset.value;

                if (value === 'skip') {
                    // Show skip reason section if hidden; if already shown, proceed with skip
                    const reasonSection = document.getElementById(`skip-reason-${stepIndex}`);
                    if (reasonSection && reasonSection.style.display !== 'block') {
                        reasonSection.style.display = 'block';
                        const reasonInput = document.getElementById(`skip-reason-text-${stepIndex}`);
                        if (reasonInput) reasonInput.focus();
                        return;
                    }
                    // If already shown, proceed with skip (updateStep validates reason)
                    Player.updateStep(stepIndex, 'skip');
                } else {
                    // OK / NG
                    Player.updateStep(stepIndex, value);
                }
            });
        });

        // Comment inputs
        document.querySelectorAll('.execution-comment').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                Player.getExecutionData(index).comment = e.target.value.trim();
                this.saveExecutionState();
            });
        });

        // Paste handlers for evidence upload areas
        document.querySelectorAll('.evidence-upload').forEach(area => {
            const stepIndex = parseInt(area.dataset.step);
            Utils.handlePaste(area, 1280, 0.8, (base64) => {
                const data = Player.getExecutionData(stepIndex);
                if (!data.images) data.images = [];
                data.images.push(base64);
                this.saveExecutionState();
                Player.renderEvidenceImages(stepIndex);
            });
        });
    },

    // Get execution data for a step
    getExecutionData: function(index) {
        if (!window.app.state.executionData[index]) {
            window.app.state.executionData[index] = {
                datetime: '',
                judgment: '未判定',
                skip: false,
                skip_reason: '',
                images: [],
                comment: ''
            };
        }
        return window.app.state.executionData[index];
    },

    // Update step judgment
    updateStep: function(index, action) {
        const data = this.getExecutionData(index);
        
        if (action === 'skip') {
            const reasonSection = document.getElementById(`skip-reason-${index}`);
            const reasonInput = document.getElementById(`skip-reason-text-${index}`);
            const errorEl = reasonSection.querySelector('.skip-error');
            
            if (!reasonInput.value.trim()) {
                errorEl.textContent = 'スキップ理由を入力してください';
                errorEl.style.display = 'block';
                return;
            }
            errorEl.style.display = 'none';
            data.skip = true;
            data.skip_reason = reasonInput.value.trim();
        } else {
            data.skip = false;
            data.skip_reason = '';
            data.judgment = action === 'ok' ? 'OK' : 'NG';
        }
        
        data.datetime = new Date().toLocaleString('ja-JP');
        this.saveExecutionState();
        this.renderSteps();
    },

    // Render evidence images for a step
    renderEvidenceImages: function(stepIndex) {
        const container = document.getElementById(`evidence-images-${stepIndex}`);
        if (!container) return;

        const images = this.getExecutionData(stepIndex).images || [];
        if (images.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = images.map((img, idx) => `
            <div style="position:relative;display:inline-block;margin:4px;">
                <img src="${img}" class="execution-thumb" style="width:100px;height:75px;object-fit:cover;border-radius:6px;border:1px solid var(--border-color);cursor:pointer;" onclick="Player.openMediaPreview('${img}')">
                <button class="image-delete-btn" onclick="Player.deleteImage(${stepIndex}, ${idx})" title="画像を削除" style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;padding:0;display:flex;align-items:center;justify-content:center;"><span class="material-icons" style="font-size:16px;">delete</span></button>
            </div>
        `).join('');
    },

    // Open image preview (larger view)
    openMediaPreview: function(src) {
        const existing = document.querySelector('.image-preview-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'image-preview-overlay';
        overlay.innerHTML = `<img src="${src}" alt="プレビュー">`;
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    },

    // Delete execution image
    deleteImage: function(stepIndex, imgIndex) {
        const data = this.getExecutionData(stepIndex);
        if (!data.images) return;
        data.images.splice(imgIndex, 1);
        this.saveExecutionState();
        this.renderEvidenceImages(stepIndex);
    },

    _recordSavedForCurrentSession: null,

    // Save execution record to localStorage for history
    // Guard against duplicate records when renderComplete is called multiple times
    saveExecutionRecord: function(sop, execData) {
        // Prevent duplicate record for the same SOP in the current execution session
        if (this._recordSavedForCurrentSession === sop.sop_id) {
            return;
        }
        this._recordSavedForCurrentSession = sop.sop_id;

        try {
            const records = JSON.parse(localStorage.getItem('execution_records') || '[]');
            const record = {
                id: Utils.generateId(),
                sop_id: sop.sop_id,
                sop_title: sop.sop_title,
                executed_at: new Date().toISOString(),
                steps: Utils.deepClone(sop.steps),
                data: execData
            };
            records.push(record);
            // Keep last 50 records
            if (records.length > 50) records.splice(0, records.length - 50);
            localStorage.setItem('execution_records', JSON.stringify(records));
        } catch (e) {
            console.warn('Failed to save execution record:', e);
        }
    },

    // Render completion screen with detailed execution records (上下2段構成カード)
    renderComplete: function() {
        const main = document.getElementById('main-content');
        const sop = window.app.state.currentSop;
        const executionData = ExcelExport.generateExecutionData(sop);
        const execData = window.app.state.executionData || [];

        // Save execution record to localStorage for history
        this.saveExecutionRecord(sop, execData);

        // Build detailed 2-row card layout for each step
        const stepsHtml = sop.steps.map((step, index) => {
            const data = execData[index] || {};
            const judgment = data.skip ? 'スキップ' : (data.judgment || '未判定');
            const refImage = step.images && step.images.length > 0 ? step.images[0] : null;
            const evidenceImages = data.images || [];

            return `
                <div class="player-step-card" data-step-index="${index}">
                    <div class="player-step-header">
                        <span class="step-number">ステップ ${index + 1}</span>
                        <span class="step-completed-badge">${judgment}</span>
                    </div>
                    <div class="player-step-row">
                        <div class="player-step-left">
                            <div class="player-step-top">
                                <div class="instruction" style="font-size:12pt;padding:12px;margin-bottom:8px;">
                                    ${this.escapeHtml(step.instruction || '（未入力）')}
                                </div>
                                ${refImage ? `
                                    <div style="margin-bottom:8px;">
                                        <label style="font-size:10pt;font-weight:600;color:var(--gray-500);display:block;margin-bottom:4px;">参照画像:</label>
                                        <img src="${refImage}" class="reference-image" style="max-width:240px;max-height:180px;border-radius:var(--radius);border:1px solid var(--border-color);cursor:pointer;" onclick="Player.openMediaPreview('${refImage}')">
                                    </div>
                                ` : ''}
                                ${step.comment ? `
                                    <div style="color:var(--gray-500);font-size:10pt;background:var(--gray-50);padding:8px;border-radius:var(--radius-sm);border-left:3px solid var(--primary);">
                                        ${this.escapeHtml(step.comment)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="player-step-right">
                            <div class="input-section" style="margin-bottom:0;">
                                <div style="margin-bottom:8px;">
                                    <label style="font-size:10pt;font-weight:600;color:var(--gray-700);display:block;margin-bottom:4px;">完了日付・時刻</label>
                                    <span class="datetime-display" style="font-size:10pt;">${data.datetime || '（未記録）'}</span>
                                </div>
                                <div style="margin-bottom:8px;">
                                    <label style="display:block;font-size:10pt;font-weight:600;color:var(--gray-700);margin-bottom:4px;">判定</label>
                                    <span style="display:inline-block;padding:8px 12px;font-size:10pt;font-weight:600;color:${judgment === 'OK' ? 'var(--success)' : judgment === 'NG' ? 'var(--danger)' : 'var(--skip)'};border:1px solid var(--gray-300);border-radius:var(--radius);background:var(--bg-primary);">${judgment}</span>
                                </div>
                                ${data.skip && data.skip_reason ? `
                                    <div style="margin-bottom:8px;">
                                        <label style="font-size:10pt;font-weight:600;color:var(--gray-700);display:block;margin-bottom:4px;">スキップ理由</label>
                                        <span style="font-size:10pt;">${this.escapeHtml(data.skip_reason)}</span>
                                    </div>
                                ` : ''}
                                <div style="margin-top:8px;">
                                    <label style="display:block;font-size:10pt;font-weight:600;color:var(--gray-700);margin-bottom:4px;">作業コメント</label>
                                    <textarea readonly style="width:100%;font-size:10pt;padding:6px;border:1px solid var(--gray-300);border-radius:var(--radius-sm);resize:vertical;background:var(--bg-primary);color:var(--text-primary);">${this.escapeHtml(data.comment || '')}</textarea>
                                </div>
                                ${evidenceImages.length > 0 ? `
                                    <div style="margin-top:8px;">
                                        <label style="display:block;font-size:10pt;font-weight:600;color:var(--gray-700);margin-bottom:4px;">エビデンス画像</label>
                                        <div class="captured-images" style="min-height:auto;padding:12px;">
                                            ${evidenceImages.map((img, idx) => `
                                                <div style="position:relative;display:inline-block;margin:4px;">
                                                    <img src="${img}" class="execution-thumb" style="width:100px;height:75px;object-fit:cover;border-radius:6px;border:1px solid var(--border-color);cursor:pointer;" onclick="Player.openMediaPreview('${img}')">
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        main.innerHTML = `
            <div class="player-container" style="max-width:1100px;">
                <div class="player-header">
                    <h2>${this.escapeHtml(sop.sop_title)}</h2>
                    <div class="step-counter">${sop.steps.length} ステップ</div>
                </div>
                
                <div style="text-align: center; margin-bottom: 24px;">
                    <h3 style="color: var(--success); margin-bottom: 8px;">全てのステップが完了しました</h3>
                    <p style="color: var(--gray-500);">実施記録の詳細とExcel出力が可能です</p>
                </div>

                <div class="player-all-steps">
                    ${stepsHtml}
                </div>

                <div class="player-footer" style="justify-content: center;">
                    <button class="secondary" onclick="app.showSelectionView()">TOP画面へ</button>
                    <button onclick="Player.exportExcel()">Excel出力</button>
                </div>
            </div>
        `;

        // Clear current execution state
        localStorage.removeItem('execution_data');

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
