// Main Application Controller for SOP Management System

const app = {
    state: {
        currentSop: null,
        executionData: {},
        currentView: 'selection', // selection, admin, player
        currentSopId: null,
        currentStepIndex: 0
    },

    // Initialize application
    init: function() {
        // Try to restore previous state
        this.restoreState();
        
        // If no state to restore, show selection view
        if (!this.restoreCurrentView()) {
            this.showSelectionView();
        }
        
        // Setup global event listeners
        this.setupGlobalListeners();
    },

    // Save current state to localStorage for reload resilience
    saveState: function() {
        try {
            const stateToSave = {
                currentView: this.state.currentView,
                currentSopId: this.state.currentSop ? this.state.currentSop.sop_id : null,
                currentStepIndex: this.state.currentStepIndex
            };
            localStorage.setItem('app_state', JSON.stringify(stateToSave));
        } catch (e) {
            console.warn('Failed to save app state:', e);
        }
    },

    // Restore state from localStorage
    restoreState: function() {
        try {
            const saved = localStorage.getItem('app_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state.currentView = parsed.currentView || 'selection';
                this.state.currentSopId = parsed.currentSopId || null;
                this.state.currentStepIndex = parsed.currentStepIndex || 0;
            }
        } catch (e) {
            console.warn('Failed to restore app state:', e);
        }
    },

    // Restore the current view based on saved state
    restoreCurrentView: function() {
        const view = this.state.currentView;
        const sopId = this.state.currentSopId;

        if (view === 'admin' && sopId) {
            const templates = this.getSopTemplates();
            const sop = templates.find(t => t.sop_id === sopId);
            if (sop) {
                this.state.currentSop = Utils.deepClone(sop);
                // Don't immediately push to templates on restore
                this.showAdminView();
                return true;
            }
        } else if (view === 'player' && sopId) {
            const templates = this.getSopTemplates();
            const sop = templates.find(t => t.sop_id === sopId);
            if (sop && sop.steps.length > 0) {
                this.state.currentSop = Utils.deepClone(sop);
                // Initialize execution data
                this.state.executionData = [];
                sop.steps.forEach((step, index) => {
                    this.state.executionData[index] = {
                        datetime: '',
                        judgment: '未判定',
                        skip: false,
                        skip_reason: '',
                        images: [],
                        comment: ''
                    };
                });
                // Restore from saved execution data if available
                const savedExec = localStorage.getItem('execution_data');
                if (savedExec) {
                    try {
                        const parsed = JSON.parse(savedExec);
                        if (parsed.sop_id === sopId) {
                            this.state.executionData = parsed.data;
                            this.state.currentStepIndex = parsed.currentStepIndex || 0;
                        }
                    } catch (e) {}
                }
                Player.previewMode = false;
                Player.currentStepIndex = this.state.currentStepIndex;
                Player.renderSteps();
                return true;
            }
        }

        return false;
    },

    // Load saved SOPs from localStorage
    loadSavedSop: function() {
        try {
            const saved = localStorage.getItem('currentSop');
            if (saved) {
                this.state.currentSop = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load saved SOP:', e);
        }
    },

    // Get all SOP templates
    getSopTemplates: function() {
        try {
            return JSON.parse(localStorage.getItem('sop_templates') || '[]');
        } catch (e) {
            console.warn('Failed to load SOP templates:', e);
            return [];
        }
    },

    // Update menu active state
    updateMenuActive: function(currentView) {
        const menuItems = document.querySelectorAll('#main-menu .menu-item');
        menuItems.forEach(item => {
            const view = item.getAttribute('data-view');
            if (view === currentView) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    // Setup global event listeners
    setupGlobalListeners: function() {
        // Network status monitoring
        window.addEventListener('online', () => {
            console.log('Network restored');
        });

        window.addEventListener('offline', () => {
            alert('ネットワーク接続が切断されました。復旧後、自動的にデータを送信します。');
        });

        // Close modal on overlay click
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') {
                Utils.hideModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape to close modal
            if (e.key === 'Escape') {
                Utils.hideModal();
            }
        });

        // Save state before unload
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });

        // Brand (SOP管理システム) click → TOP
        const brand = document.querySelector('#main-menu .menu-brand');
        if (brand) {
            brand.addEventListener('click', () => {
                this.showSelectionView();
            });
        }

        // Implement showExecutionRecords globally
        window.showExecutionRecords = () => {
            this.showExecutionRecords();
        };

        // Menu navigation
        document.querySelectorAll('#main-menu .menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                if (view === 'selection') {
                    this.showSelectionView();
                } else if (view === 'admin') {
                    // If no current SOP, create new one
                    if (!this.state.currentSop) {
                        this.createNewSop();
                    } else {
                        this.showAdminView();
                    }
                } else if (view === 'player') {
                    // Switch to player mode - show SOP selection for execution
                    if (this.state.currentSop && this.state.currentSop.steps.length > 0) {
                        this.executeSop(this.state.currentSop.sop_id);
                    } else {
                        // Show SOP list for selection
                        this.state.currentView = 'player-select';
                        this.saveState();
                        const main = document.getElementById('main-content');
                        const templates = this.getSopTemplates();
                        main.innerHTML = `
                            <div style="max-width: 1200px; margin: 48px auto; padding: 0 24px;">
                                <div class="card">
                                    <div class="card-header">実施するSOPを選択</div>
                                    ${templates.length > 0 ? `
                                        <div class="sop-list">
                                            ${templates.filter(t => t.steps.length > 0).map(sop => `
                                                <div class="sop-card" onclick="app.executeSop('${sop.sop_id}')">
                                                    <div class="sop-card-title">${this.escapeHtml(sop.sop_title)}</div>
                                                    <div class="sop-card-meta">ステップ数: ${sop.steps.length}</div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    ` : '<p style="text-align:center;color:var(--gray-400);padding:40px;">実施可能なSOPがありません</p>'}
                                </div>
                            </div>
                        `;
                    }
                }
            });
        });
    },

    // Check if current SOP has unsaved changes
    hasUnsavedChanges: function() {
        if (!this.state.currentSop) return false;
        
        const templates = this.getSopTemplates();
        const saved = templates.find(t => t.sop_id === this.state.currentSop.sop_id);
        if (!saved) {
            // New SOP - check if it has any content beyond defaults
            const sop = this.state.currentSop;
            return sop.steps.length > 0 || sop.sop_title !== '新規SOP';
        }
        
        // Compare current with saved
        const currentStr = JSON.stringify(this.state.currentSop);
        const savedStr = JSON.stringify(saved);
        return currentStr !== savedStr;
    },

    // Show unsaved changes confirmation dialog
    confirmUnsavedChanges: function(callback) {
        if (!this.hasUnsavedChanges()) {
            callback('discard');
            return;
        }

        const overlay = document.getElementById('modal-overlay');
        const content = document.getElementById('modal-content');
        content.classList.remove('step-form-modal');
        
        content.innerHTML = `
            <div class="modal-header">未保存の変更があります</div>
            <div class="modal-body">
                <p>SOPに未保存の変更があります。どうしますか？</p>
            </div>
            <div class="modal-footer">
                <button class="primary" id="unsaved-save-btn">保存して戻る</button>
                <button class="secondary" id="unsaved-discard-btn">破棄して戻る</button>
                <button class="secondary" id="unsaved-cancel-btn">キャンセル</button>
            </div>
        `;
        overlay.style.display = 'flex';

        document.getElementById('unsaved-save-btn').addEventListener('click', () => {
            // Save current SOP
            const titleInput = document.getElementById('sop-title');
            if (titleInput) {
                this.state.currentSop.sop_title = titleInput.value.trim() || '新規SOP';
            }
            this.state.currentSop.updated_at = new Date().toISOString();
            let templates = this.getSopTemplates();
            const existingIdx = templates.findIndex(t => t.sop_id === this.state.currentSop.sop_id);
            if (existingIdx >= 0) {
                templates[existingIdx] = Utils.deepClone(this.state.currentSop);
            } else {
                templates.push(Utils.deepClone(this.state.currentSop));
            }
            localStorage.setItem('sop_templates', JSON.stringify(templates));
            this.saveCurrentSop();
            Utils.hideModal();
            callback('save');
        });

        document.getElementById('unsaved-discard-btn').addEventListener('click', () => {
            callback('discard');
        });

        document.getElementById('unsaved-cancel-btn').addEventListener('click', () => {
            callback('cancel');
        });
    },

    // Show selection view (A-01)
    showSelectionView: function() {
        // Check for unsaved changes before leaving admin view
        if (this.state.currentView === 'admin' && this.hasUnsavedChanges()) {
            this.confirmUnsavedChanges((action) => {
                if (action === 'cancel') return;
                this.doShowSelectionView();
            });
            return;
        }
        
        this.doShowSelectionView();
    },

    doShowSelectionView: function() {
        this.state.currentView = 'selection';
        this.state.currentSopId = this.state.currentSop ? this.state.currentSop.sop_id : null;
        this.saveState();
        this.updateMenuActive('selection');
        
        const main = document.getElementById('main-content');
        const templates = this.getSopTemplates();

        main.innerHTML = `
            <div class="main-content">
                <div class="card">
                    <div class="card-header">SOP一覧 (${templates.length}件)</div>
                    
                    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                        <button id="new-sop-btn" class="top-action-btn">
                            + 新規SOP作成
                        </button>
                        <button id="load-sop-btn" class="secondary top-action-btn">
                            JSONファイルから読み込み
                        </button>
                        <button id="records-btn" class="secondary top-action-btn" onclick="app.showExecutionRecords()">
                            <span class="material-icons">list_alt</span> 実施記録
                        </button>
                        <input type="file" id="sop-file-input" accept=".json" style="display: none;">
                    </div>

                    ${templates.length > 0 ? `
                        <div class="sop-list">
                            ${templates.map((sop, index) => `
                                <div class="sop-card">
                                    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                                        <div>
                                            <div class="sop-card-title" style="margin-bottom:4px;">${this.escapeHtml(sop.sop_title)}</div>
                                            <div class="sop-card-meta" style="margin-bottom:0;">
                                                ステップ数: ${sop.steps.length} | 
                                                更新日: ${sop.updated_at ? new Date(sop.updated_at).toLocaleString('ja-JP') : '未保存'}
                                            </div>
                                        </div>
                                        <div class="sop-card-actions" style="flex-shrink:0;gap:6px;">
                                            <button class="secondary" style="padding:4px 10px;font-size:10pt;" onclick="event.stopPropagation();app.editSop('${sop.sop_id}')" title="編集"><span class="material-icons">edit</span></button>
                                            <button style="padding:4px 10px;font-size:10pt;" onclick="event.stopPropagation();app.executeSop('${sop.sop_id}')" title="実施"><span class="material-icons">play_arrow</span></button>
                                            <button class="secondary" style="padding:4px 10px;font-size:10pt;" onclick="event.stopPropagation();app.exportSop('${sop.sop_id}')" title="エクスポート"><span class="material-icons">file_download</span></button>
                                            <button class="danger" style="padding:4px 10px;font-size:10pt;" onclick="event.stopPropagation();app.deleteSop('${sop.sop_id}')" title="削除"><span class="material-icons">delete</span></button>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="text-align:center;color:var(--gray-400);padding:20px;">SOPがありません。「+ 新規SOP作成」ボタンから作成してください。</p>'}
                </div>
            </div>
        `;

        // Attach event listeners
        const newSopBtn = document.getElementById('new-sop-btn');
        if (newSopBtn) {
            newSopBtn.addEventListener('click', () => {
                this.createNewSop();
            });
        }

        // Load button
        const loadBtn = document.getElementById('load-sop-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('sop-file-input');
                if (fileInput) fileInput.click();
            });
        }

        const fileInput = document.getElementById('sop-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e);
            });
        }
    },

    // Show admin view (A-02)
    showAdminView: function() {
        this.state.currentView = 'admin';
        this.state.currentSopId = this.state.currentSop ? this.state.currentSop.sop_id : null;
        this.saveState();
        this.updateMenuActive('admin');
        
        const main = document.getElementById('main-content');
        const sop = this.state.currentSop;

        main.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <input type="text" id="sop-title" value="${this.escapeHtml(sop.sop_title)}" placeholder="SOPタイトルを入力" style="width: 100%; font-size: 14pt; padding: 12px;">
                </div>
                
                <div style="display:flex;gap:8px;margin-bottom:16px;">
                    <button id="save-sop-btn" disabled style="flex:1;"><span class="material-icons">save</span> 保存</button>
                    <button id="cancel-sop-btn" class="danger" style="flex:1;"><span class="material-icons">close</span> キャンセル</button>
                </div>
                
                <button id="add-step-btn" style="width: 100%; margin-bottom: 16px;">+ ステップ追加</button>
                
                <ul class="steps-list" id="steps-list">
                    <!-- Steps will be rendered here -->
                </ul>
            </div>
        `;

        // Attach admin events
        Admin.init();

        // Attach header events (buttons now in main content)
        const cancelBtn = document.getElementById('cancel-sop-btn');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (this.state.currentSop) {
                    this.state.currentSop = null;
                }
                this.doShowSelectionView();
            });
        }

        // Enable save button when SOP title changes
        const titleInput = document.getElementById('sop-title');
        if (titleInput) {
            titleInput.addEventListener('input', () => {
                Admin.updateSaveButtonState(true);
            });
        }

    },

    // Create new SOP
    createNewSop: function() {
        this.state.currentSop = Utils.createEmptySop();
        // Do NOT add to templates immediately - wait for save
        this.saveCurrentSop();
        this.showAdminView();
    },

    // Edit existing SOP
    editSop: function(sopId) {
        const templates = this.getSopTemplates();
        const sop = templates.find(t => t.sop_id === sopId);
        if (sop) {
            this.state.currentSop = Utils.deepClone(sop);
            this.showAdminView();
        } else {
            alert('SOPが見つかりませんでした。');
        }
    },

    // Execute SOP
    executeSop: function(sopId) {
        const templates = this.getSopTemplates();
        const sop = templates.find(t => t.sop_id === sopId);
        if (sop) {
            if (sop.steps.length === 0) {
                alert('実施可能なステップがありません。');
                return;
            }
            this.state.currentSop = Utils.deepClone(sop);
            this.state.currentSopId = sopId;
            this.state.currentStepIndex = 0;
            this.saveState();
            this.updateMenuActive('player');
            Player.showStartScreen(this.state.currentSop);
        } else {
            alert('SOPが見つかりませんでした。');
        }
    },

    // Delete SOP
    deleteSop: function(sopId) {
        if (!confirm('このSOPを削除しますか？')) {
            return;
        }

        let templates = this.getSopTemplates();
        templates = templates.filter(t => t.sop_id !== sopId);
        
        try {
            localStorage.setItem('sop_templates', JSON.stringify(templates));
            this.state.currentSop = null;
            this.showSelectionView();
            alert('SOPを削除しました。');
        } catch (e) {
            alert('削除に失敗しました: ' + e.message);
        }
    },

    // Export SOP template as JSON
    exportSop: function(sopId) {
        const templates = this.getSopTemplates();
        const sop = templates.find(t => t.sop_id === sopId);
        if (!sop) {
            alert('エクスポートするSOPが見つかりませんでした。');
            return;
        }

        const jsonStr = JSON.stringify(sop, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sop_${sop.sop_title || 'template'}_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Handle file upload - always add as new SOP, never overwrite
    handleFileUpload: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const validation = Utils.validateSopTemplate(e.target.result);
            
            if (!validation.valid) {
                alert('JSONファイルが無効です: ' + validation.error);
                return;
            }

            const sop = validation.data;
            // Generate new sop_id to avoid overwriting existing SOP
            sop.sop_id = Utils.generateId();
            
            // Add to templates list as new SOP
            let templates = this.getSopTemplates();
            templates.push(sop);
            localStorage.setItem('sop_templates', JSON.stringify(templates));

            this.state.currentSop = sop;
            this.saveCurrentSop();

            alert('SOPを読み込みました: ' + sop.sop_title);
            this.showSelectionView();
        };
        
        reader.readAsText(file);
    },

    // Save current SOP to localStorage
    saveCurrentSop: function() {
        try {
            localStorage.setItem('currentSop', JSON.stringify(this.state.currentSop));
        } catch (e) {
            alert('保存に失敗しました: ' + e.message);
        }
    },

    // Show execution records history
    showExecutionRecords: function() {
        const records = JSON.parse(localStorage.getItem('execution_records') || '[]');
        this.state.currentView = 'records';
        this.saveState();
        this.updateMenuActive('selection');

        const main = document.getElementById('main-content');
        main.innerHTML = `
            <div class="main-content">
                <div class="card">
                    <div class="card-header">実施記録一覧 (${records.length}件)</div>
                    ${records.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table style="width:100%;border-collapse:collapse;font-size:10pt;">
                                <thead>
                                    <tr style="background:var(--gray-50);">
                                        <th style="padding:10px 8px;border-bottom:2px solid var(--primary-light);text-align:left;font-weight:600;color:var(--gray-700);">SOPタイトル</th>
                                        <th style="padding:10px 8px;border-bottom:2px solid var(--primary-light);text-align:left;font-weight:600;color:var(--gray-700);">実施日時</th>
                                        <th style="padding:10px 8px;border-bottom:2px solid var(--primary-light);text-align:left;font-weight:600;color:var(--gray-700);">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${records.slice().reverse().map((record, idx) => `
                                        <tr style="cursor:pointer;" onclick="app.showRecordDetail(${records.length - 1 - idx})">
                                            <td style="padding:8px;border-bottom:1px solid var(--gray-200);font-weight:600;color:var(--primary);">${this.escapeHtml(record.sop_title)}</td>
                                            <td style="padding:8px;border-bottom:1px solid var(--gray-200);">${new Date(record.executed_at).toLocaleString('ja-JP')}</td>
                                            <td style="padding:8px;border-bottom:1px solid var(--gray-200);">
                                                <button class="secondary" style="padding:4px 8px;font-size:9pt;" onclick="event.stopPropagation();app.showRecordDetail(${records.length - 1 - idx})">詳細</button>
                                                <button class="danger" style="padding:4px 8px;font-size:9pt;" onclick="event.stopPropagation();app.deleteRecord(${records.length - 1 - idx})">削除</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p style="text-align:center;color:var(--gray-400);padding:20px;">実施記録がありません。</p>'}
                    <div style="margin-top:16px;text-align:center;">
                        <button class="secondary" onclick="app.showSelectionView()">TOP画面へ戻る</button>
                    </div>
                </div>
            </div>
        `;
    },

    // Show record detail with detailed 2-row card layout
    showRecordDetail: function(index) {
        const records = JSON.parse(localStorage.getItem('execution_records') || '[]');
        const record = records[index];
        if (!record) return;

        const main = document.getElementById('main-content');
        const steps = record.steps || [];
        const execData = record.data || [];

        // Build detailed 2-row card layout for each step
        const stepsHtml = steps.map((step, i) => {
            const data = execData[i] || {};
            const judgment = data.skip ? 'スキップ' : (data.judgment || '未判定');
            const refImage = step.images && step.images.length > 0 ? step.images[0] : null;
            const evidenceImages = data.images || [];

            return `
                <div class="player-step-card" data-step-index="${i}">
                    <div class="player-step-header">
                        <span class="step-number">ステップ ${i + 1}</span>
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
                                    <div style="color:var(--gray-400);font-size:10pt;background:var(--bg-secondary);padding:8px;border-radius:var(--radius-sm);border-left:3px solid var(--primary);">
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
                                    <div style="display:flex;gap:4px;">
                                        <span style="flex:1;padding:8px 12px;font-size:10pt;text-align:center;font-weight:600;color:${judgment === 'OK' ? 'var(--success)' : judgment === 'NG' ? 'var(--danger)' : 'var(--skip)'};border:1px solid var(--gray-300);border-radius:var(--radius);background:var(--bg-primary);">${judgment}</span>
                                    </div>
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
            <div class="main-content">
                <div class="card">
                    <div class="card-header">${this.escapeHtml(record.sop_title)} - 実施記録詳細</div>
                    <p style="font-size:10pt;color:var(--gray-500);margin-bottom:16px;">実施日時: ${new Date(record.executed_at).toLocaleString('ja-JP')}</p>
                    ${stepsHtml ? `
                        <div class="player-all-steps">
                            ${stepsHtml}
                        </div>
                    ` : '<p style="text-align:center;color:var(--gray-400);padding:20px;">データがありません。</p>'}
                    <div style="margin-top:24px;text-align:center;">
                        <button class="secondary" onclick="app.showExecutionRecords()">実施記録一覧へ戻る</button>
                    </div>
                </div>
            </div>
        `;
    },

    // Delete execution record
    deleteRecord: function(index) {
        if (!confirm('この実施記録を削除しますか？')) return;
        const records = JSON.parse(localStorage.getItem('execution_records') || '[]');
        records.splice(index, 1);
        localStorage.setItem('execution_records', JSON.stringify(records));
        this.showExecutionRecords();
    },

    // Escape HTML
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Make app globally accessible
window.app = app;
