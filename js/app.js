// Main Application Controller for SOP Management System

const app = {
    state: {
        currentSop: null,
        executionData: {},
        currentView: 'selection' // selection, admin, player
    },

    // Initialize application
    init: function() {
        // Try to load saved SOP from localStorage
        this.loadSavedSop();
        
        // Show selection view by default
        this.showSelectionView();
        
        // Setup global event listeners
        this.setupGlobalListeners();
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

    // Setup global event listeners
    setupGlobalListeners: function() {
        // Network status monitoring
        window.addEventListener('online', () => {
            console.log('Network restored');
            // TODO: Implement retry logic for failed uploads
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
    },

    // Show selection view (A-01)
    showSelectionView: function() {
        this.state.currentView = 'selection';
        
        // Hide header
        document.getElementById('app-header').style.display = 'none';
        
        const main = document.getElementById('main-content');
        const templates = this.getSopTemplates();
        const savedSop = this.state.currentSop;

        main.innerHTML = `
            <div style="max-width: 1200px; margin: 48px auto; padding: 0 24px;">
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header">SOP管理システム</div>
                    
                    <div style="margin-bottom: 24px;">
                        <p style="margin-bottom: 16px;">以下の選択肢から操作を選んでください。</p>
                        
                        <button id="new-sop-btn" style="width: 100%; margin-bottom: 12px; padding: 16px; font-size: 12pt;">
                            + 新規SOP作成
                        </button>
                        
                        <button id="load-sop-btn" class="secondary" style="width: 100%; padding: 16px; font-size: 12pt;">
                            JSONファイルから読み込み
                        </button>
                        <input type="file" id="sop-file-input" accept=".json" style="display: none;">
                    </div>
                </div>

                ${templates.length > 0 ? `
                    <div class="card">
                        <div class="card-header">SOP一覧 (${templates.length}件)</div>
                        <div class="sop-list">
                            ${templates.map((sop, index) => `
                                <div class="sop-card">
                                    <div class="sop-card-title">${this.escapeHtml(sop.sop_title)}</div>
                                    <div class="sop-card-meta">
                                        ステップ数: ${sop.steps.length} | 
                                        更新日: ${sop.updated_at ? new Date(sop.updated_at).toLocaleString('ja-JP') : '未保存'}
                                    </div>
                                    <div class="sop-card-actions">
                                        <button class="secondary" onclick="app.editSop('${sop.sop_id}')">編集</button>
                                        <button onclick="app.executeSop('${sop.sop_id}')">実施</button>
                                        <button class="secondary" onclick="app.exportSop('${sop.sop_id}')">エクスポート</button>
                                        <button class="danger" onclick="app.deleteSop('${sop.sop_id}')">削除</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
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
        
        // Show header
        const header = document.getElementById('app-header');
        header.style.display = 'flex';
        
        const title = document.getElementById('page-title');
        title.textContent = '管理者画面';
        
        const actions = document.getElementById('header-actions');
        actions.innerHTML = `
            <button id="back-to-selection-btn" class="secondary">選択画面へ</button>
            <button id="save-sop-btn">保存</button>
            <button id="preview-btn">プレビュー</button>
        `;

        // Attach header events
        document.getElementById('back-to-selection-btn').addEventListener('click', () => {
            this.showSelectionView();
        });

        document.getElementById('save-sop-btn').addEventListener('click', () => {
            Admin.saveSop();
        });

        document.getElementById('preview-btn').addEventListener('click', () => {
            Admin.openPreview();
        });

        const main = document.getElementById('main-content');
        const sop = this.state.currentSop;

        main.innerHTML = `
            <div style="display: flex; gap: 24px;">
                <!-- Left: Steps List -->
                <div class="card" style="flex: 1;">
                    <div class="card-header">
                        <input type="text" id="sop-title" value="${this.escapeHtml(sop.sop_title)}" placeholder="SOPタイトルを入力" style="width: 100%; font-size: 12pt; padding: 8px;">
                    </div>
                    
                    <button id="add-step-btn" style="width: 100%; margin-bottom: 16px; margin-top: 16px;">+ ステップ追加</button>
                    
                    <ul class="steps-list" id="steps-list">
                        <!-- Steps will be rendered here -->
                    </ul>
                </div>
            </div>
        `;

        // Attach admin events
        Admin.init();
    },

    // Create new SOP
    createNewSop: function() {
        this.state.currentSop = Utils.createEmptySop();
        this.saveCurrentSop();
        // Also add to templates list immediately
        let templates = this.getSopTemplates();
        templates.push(Utils.deepClone(this.state.currentSop));
        localStorage.setItem('sop_templates', JSON.stringify(templates));
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

    // Handle file upload
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

            this.state.currentSop = validation.data;
            this.saveCurrentSop();
            alert('SOPを読み込みました: ' + validation.data.sop_title);
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