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

    // Start preview mode (whole SOP preview)
    startPreview: function() {
        this.previewMode = true;
        this.currentStepIndex = 0;
        this.renderPreview();
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

    // Start execution (no operator name parameter)
    startExecution: function() {
        this.previewMode = false;
        this.currentStepIndex = 0;
        
        // Initialize execution data
        window.app.state.executionData = [];
        window.app.state.currentSop.steps.forEach((step, index) => {
            window.app.state.executionData[index] = {
                time: '',
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
                                <img src="${img}" class="reference-image" alt="参考画像${idx + 1}" onclick="Player.openImagePreview('${img}')">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        main.innerHTML = `
            <div class="preview-container">
                <div class="preview-header">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <input type="text" id="preview-sop-title" value="${this.escapeHtml(sop.sop_title)}" placeholder="SOPタイトルを入力" style="font-size:16pt;font-weight:600;padding:12px 16px;border:1px solid var(--gray-300);border-radius:var(--radius);flex:1;margin-right:12px;">
                        <button onclick="Player.savePreview()">保存</button>
                    </div>
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

    // Save from preview mode
    savePreview: function() {
        const titleInput = document.getElementById('preview-sop-title');
        if (titleInput) {
            const title = titleInput.value.trim() || '新規SOP';
            window.app.state.currentSop.sop_title = title;
            window.app.state.currentSop.updated_at = new Date().toISOString();
            Admin.saveSop();
            this.renderPreview();
        }
    },

    // Render all steps in one scrollable view (replaces renderStep)
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
                            <div class="instruction" style="font-size:12pt;padding:12px;margin-bottom:12px;">
                                ${this.escapeHtml(step.instruction)}
                            </div>

                            ${step.comment ? `
                                <div class="comment-section" style="margin-bottom:12px;">
                                    <label>補足コメント:</label>
                                    <div style="background:#f5f5f5;padding:10px;border-radius:4px;border-left:4px solid #0078d4;font-size:10pt;">
                                        ${this.escapeHtml(step.comment)}
                                    </div>
                                </div>
                            ` : ''}

                            <div class="input-section" style="padding:12px;margin-bottom:12px;">
                                <div class="input-row" style="margin-bottom:8px;">
                                    <label style="min-width:80px;font-size:10pt;">完了時刻:</label>
                                    <span id="time-display-${index}" style="font-size:10pt;">${stepData.time ? this.escapeHtml(stepData.time) : '（未記録）'}</span>
                                </div>

                                <div class="input-row" style="margin-bottom:8px;">
                                    <label style="min-width:80px;font-size:10pt;">判定:</label>
                                    <div class="toggle-group" id="judgment-group-${index}" data-step="${index}">
                                        <button class="toggle-btn ${stepData.judgment === 'OK' ? 'selected' : ''}" data-value="OK" data-step="${index}">OK</button>
                                        <button class="toggle-btn ${stepData.judgment === 'NG' ? 'selected' : ''}" data-value="NG" data-step="${index}">NG</button>
                                    </div>
                                </div>

                                <div class="input-row" style="margin-bottom:8px;">
                                    <label style="min-width:80px;font-size:10pt;">作業コメント:</label>
                                </div>
                                <textarea class="step-operator-comment" data-step="${index}" placeholder="作業記録を入力" rows="2" style="font-size:10pt;">${stepData.comment || ''}</textarea>

                                <div class="skip-reason-section" id="skip-reason-section-${index}" style="margin-top:8px;padding:10px;">
                                    <label for="skip-reason-${index}" style="font-size:10pt;">スキップ理由</label>
                                    <textarea class="step-skip-reason" id="skip-reason-${index}" data-step="${index}" placeholder="スキップする場合は理由を入力してください" rows="2" style="font-size:10pt;">${stepData.skip_reason || ''}</textarea>
                                </div>
                            </div>

                            <div class="player-step-actions">
                                <button class="btn-skip step-skip-btn" data-step="${index}" style="font-size:10pt;padding:8px 16px;">スキップ</button>
                            </div>
                        </div>
                        <div class="player-step-right">
                            ${step.images && step.images.length > 0 ? `
                                <div class="reference-images" style="margin-bottom:12px;">
                                    <label style="font-size:10pt;font-weight:600;color:var(--gray-500);display:block;margin-bottom:4px;">参照画像:</label>
                                    ${step.images.map((img, idx) => `
                                        <img src="${img}" class="reference-image" style="max-width:100%;max-height:120px;" alt="参考画像${idx + 1}" onclick="Player.openImagePreview('${img}')">
                                    `).join('')}
                                </div>
                            ` : ''}
                            <div class="player-evidence-area">
                                <label style="font-size:10pt;font-weight:600;color:var(--gray-500);display:block;margin-bottom:4px;">エビデンス画像:</label>
                                <div class="captured-images" id="captured-images-${index}" data-step="${index}">
                                    ${(stepData.images || []).map((img, idx) => `
                                        <div style="position:relative;display:inline-block;">
                                            <img src="${img}" class="execution-thumb" style="width:100px;height:75px;object-fit:cover;border-radius:6px;border:1px solid #ddd;cursor:pointer;" onclick="Player.openImagePreview('${img}')">
                                            <button class="image-delete-btn" onclick="Player.deleteImage(${index}, ${idx})" title="画像を削除">×</button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        main.innerHTML = `
            <div class="player-container" style="max-width:1000px;">
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

        this.setupPlayerEvents();
    },

    // Setup player view event listeners
    setupPlayerEvents: function() {
        // Judgment toggle - record time on click
        document.querySelectorAll('[id^="judgment-group-"]').forEach(group => {
            group.addEventListener('click', (e) => {
                const btn = e.target.closest('.toggle-btn');
                if (!btn) return;

                const stepIndex = parseInt(btn.dataset.step);
                const stepData = window.app.state.executionData[stepIndex];
                if (!stepData) return;

                // Toggle selection within this group
                group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');

                // Record judgment
                stepData.judgment = btn.dataset.value;

                // Auto record time
                const time = Utils.formatTime();
                stepData.time = time;
                const timeDisplay = document.getElementById(`time-display-${stepIndex}`);
                if (timeDisplay) {
                    timeDisplay.textContent = time;
                }

                // Mark step as completed
                const stepCard = document.querySelector(`.player-step-card[data-step-index="${stepIndex}"]`);
                if (stepCard) {
                    const header = stepCard.querySelector('.player-step-header');
                    if (!header.querySelector('.step-completed-badge')) {
                        const badge = document.createElement('span');
                        badge.className = 'step-completed-badge';
                        badge.textContent = '完了';
                        header.appendChild(badge);
                    }
                }

                // Save execution state
                this.saveExecutionState();

                // Check if all steps completed
                this.checkAllCompleted();
            });
        });

        // Comment input
        document.querySelectorAll('.step-operator-comment').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const stepIndex = parseInt(e.target.dataset.step);
                if (!window.app.state.executionData[stepIndex]) {
                    window.app.state.executionData[stepIndex] = {};
                }
                window.app.state.executionData[stepIndex].comment = e.target.value;
                this.saveExecutionState();
            });
        });

        // Skip reason input
        document.querySelectorAll('.step-skip-reason').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const stepIndex = parseInt(e.target.dataset.step);
                if (!window.app.state.executionData[stepIndex]) {
                    window.app.state.executionData[stepIndex] = {};
                }
                window.app.state.executionData[stepIndex].skip_reason = e.target.value;
                this.saveExecutionState();
                // Auto-clear error message when user starts typing
                const errorMsg = document.querySelector(`#skip-reason-section-${stepIndex} .skip-error`);
                if (errorMsg) errorMsg.remove();
            });
        });

        // Skip button
        document.querySelectorAll('.step-skip-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stepIndex = parseInt(e.target.dataset.step);
                this.skipStep(stepIndex);
            });
        });

        // Image paste for each captured-images area
        document.querySelectorAll('.captured-images').forEach(area => {
            const stepIndex = parseInt(area.dataset.step);
            Utils.handlePaste(area, 1280, 0.8, (base64) => {
                this.addExecutionImage(stepIndex, base64);
            });
        });
    },

    // Check if all steps are completed
    checkAllCompleted: function() {
        const allCompleted = window.app.state.executionData.every(d => d.judgment !== '未判定' || d.skip);
        if (allCompleted) {
            // Small delay to show the last step completion
            setTimeout(() => {
                this.renderComplete();
            }, 500);
        }
    },

    // Skip current step
    skipStep: function(stepIndex) {
        const stepData = window.app.state.executionData[stepIndex];
        if (!stepData) return;
        
        // Check if skip reason is provided
        const skipReasonInput = document.getElementById(`skip-reason-${stepIndex}`);
        const reason = skipReasonInput ? skipReasonInput.value.trim() : (stepData.skip_reason || '');
        
        // Remove existing error message
        const existingError = document.querySelector(`#skip-reason-section-${stepIndex} .skip-error`);
        if (existingError) existingError.remove();

        if (!reason) {
            // Show inline red error message
            const skipSection = document.getElementById(`skip-reason-section-${stepIndex}`);
            if (skipSection) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'skip-error';
                errorDiv.textContent = 'スキップ理由を入力してください';
                skipSection.appendChild(errorDiv);
            }
            return;
        }

        // Record skip
        stepData.skip = true;
        stepData.skip_reason = reason;

        // Auto record time
        const time = Utils.formatTime();
        stepData.time = time;

        // Mark step as completed
        const stepCard = document.querySelector(`.player-step-card[data-step-index="${stepIndex}"]`);
        if (stepCard) {
            const header = stepCard.querySelector('.player-step-header');
            if (!header.querySelector('.step-completed-badge')) {
                const badge = document.createElement('span');
                badge.className = 'step-completed-badge';
                badge.textContent = '完了';
                header.appendChild(badge);
            }
        }

        // Save execution state
        this.saveExecutionState();

        // Check if all steps completed
        this.checkAllCompleted();
    },

    // Add execution image
    addExecutionImage: function(stepIndex, base64) {
        if (!window.app.state.executionData[stepIndex]) {
            window.app.state.executionData[stepIndex] = {};
        }
        if (!window.app.state.executionData[stepIndex].images) {
            window.app.state.executionData[stepIndex].images = [];
        }
        window.app.state.executionData[stepIndex].images.push(base64);
        this.saveExecutionState();
        this.renderExecutedImages(stepIndex);
    },

    // Render executed images for a specific step
    renderExecutedImages: function(stepIndex) {
        const container = document.getElementById(`captured-images-${stepIndex}`);
        if (!container) return;

        const images = window.app.state.executionData[stepIndex].images || [];
        if (images.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = images.map((img, idx) => `
            <div style="position:relative;display:inline-block;">
                <img src="${img}" class="execution-thumb" style="width:100px;height:75px;object-fit:cover;border-radius:6px;border:1px solid #ddd;cursor:pointer;" onclick="Player.openImagePreview('${img}')">
                <button class="image-delete-btn" onclick="Player.deleteImage(${stepIndex}, ${idx})" title="画像を削除">×</button>
            </div>
        `).join('');
    },

    // Open image preview modal
    openImagePreview: function(src) {
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
        const stepData = window.app.state.executionData[stepIndex];
        if (!stepData || !stepData.images) return;

        stepData.images.splice(imgIndex, 1);
        this.saveExecutionState();
        this.renderExecutedImages(stepIndex);
    },

    // Render completion screen
    renderComplete: function() {
        const main = document.getElementById('main-content');
        const sop = window.app.state.currentSop;
        const executionData = ExcelExport.generateExecutionData(sop);

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
                    <button class="secondary" onclick="app.showSelectionView()">TOP画面へ</button>
                    <button onclick="Player.exportExcel()">Excel出力</button>
                </div>
            </div>
        `;

        // Clear execution state
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