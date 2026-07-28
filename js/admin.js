// Admin View Module for SOP Management System

const Admin = {
    currentStepIndex: null,
    currentImages: [],
    _listenersAttached: false,

    // Initialize admin view
    init: function() {
        this.currentStepIndex = null;
        this.currentImages = [];
        this._listenersAttached = false;
        this.renderStepsList();
        this.setupEventListeners();
    },

    // Render steps list with expandable inline editing
    renderStepsList: function() {
        const stepsList = document.getElementById('steps-list');
        const steps = window.app.state.currentSop.steps;
        
        if (!stepsList) return;

        if (steps.length === 0) {
            stepsList.innerHTML = '<li class="empty-message">ステップがありません。「追加」ボタンでステップを追加してください。</li>';
            return;
        }

        stepsList.innerHTML = '';
        steps.forEach((step, index) => {
            const li = document.createElement('li');
            li.className = 'step-item';
            li.draggable = true;
            li.dataset.index = index;
            
            li.innerHTML = `
                <div class="step-item-left">
                    <span class="step-index">${index + 1}</span>
                    <button class="step-toggle-btn" data-action="toggle-detail" data-index="${index}" title="詳細を表示">▼</button>
                    <span class="step-preview">${this.escapeHtml(step.instruction) || '（未入力）'}</span>
                </div>
                <div class="step-actions">
                    <button class="danger" data-action="delete" data-index="${index}">削除</button>
                </div>
                <div class="step-detail" id="step-detail-${index}" style="display:none;width:100%;margin-top:8px;padding:12px;background:var(--gray-50);border-radius:var(--radius-sm);border:1px solid var(--gray-200);">
                    <div class="step-detail-two-column">
                        <div class="step-detail-left">
                            <div style="margin-bottom:8px;">
                                <label style="font-size:10pt;font-weight:600;color:var(--gray-500);display:block;margin-bottom:4px;">作業指示内容</label>
                                <textarea class="detail-instruction" data-index="${index}" rows="4" style="width:100%;font-size:11pt;padding:8px;border:1px solid var(--gray-300);border-radius:var(--radius-sm);">${this.escapeHtml(step.instruction)}</textarea>
                            </div>
                            <div style="margin-bottom:8px;">
                                <label style="font-size:10pt;font-weight:600;color:var(--gray-500);display:block;margin-bottom:4px;">補足コメント</label>
                                <textarea class="detail-comment" data-index="${index}" rows="2" style="width:100%;font-size:11pt;padding:8px;border:1px solid var(--gray-300);border-radius:var(--radius-sm);">${this.escapeHtml(step.comment || '')}</textarea>
                            </div>
                            <div style="display:flex;gap:8px;margin-top:8px;">
                                <button class="detail-save-btn" data-index="${index}" style="flex:1;">保存</button>
                            </div>
                        </div>
                        <div class="step-detail-right">
                            <label style="font-size:10pt;font-weight:600;color:var(--gray-500);display:block;margin-bottom:4px;">参考画像</label>
                            <div class="image-upload-area" id="detail-image-upload-${index}" style="min-height:100px;padding:10px;" data-step="${index}">
                                <div class="paste-hint" style="font-size:9pt;">Ctrl+V で画像を貼り付け</div>
                                <div class="image-thumbnails" id="detail-image-thumbnails-${index}">
                                    ${step.images && step.images.length > 0 ? step.images.map((img, idx) => `
                                        <div style="position:relative;">
                                            <img src="${img}" class="image-thumbnail" alt="画像${idx + 1}" onclick="Admin.openImagePreview('${img}')">
                                            <button class="danger" style="position:absolute;top:-8px;right:-8px;padding:4px 8px;font-size:9pt;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;" onclick="Admin.removeDetailImage(${index}, ${idx})">×</button>
                                        </div>
                                    `).join('') : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            stepsList.appendChild(li);
        });

        // Attach drag and drop events
        this.attachDragEvents();
        
        // Attach paste handlers for detail image upload areas
        steps.forEach((step, index) => {
            const uploadArea = document.getElementById(`detail-image-upload-${index}`);
            if (uploadArea) {
                Utils.handlePaste(uploadArea, 1280, 0.8, (base64) => {
                    this.addDetailImage(index, base64);
                });
            }
        });
    },

    // Setup event listeners
    setupEventListeners: function() {
        if (this._listenersAttached) return;
        this._listenersAttached = true;

        const addBtn = document.getElementById('add-step-btn');
        const saveBtn = document.getElementById('save-sop-btn');
        const previewBtn = document.getElementById('preview-btn');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.addStep());
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSop());
        }

        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.openPreview());
        }

        // Paste handler for reference images (modal)
        const imageUploadArea = document.getElementById('image-upload-area');
        if (imageUploadArea) {
            Utils.handlePaste(imageUploadArea, 1280, 0.8, (base64) => {
                this.addImage(base64);
            });
        }

        // Step list click events
        const stepsList = document.getElementById('steps-list');
        if (stepsList) {
            stepsList.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                const action = target.dataset.action;
                const index = parseInt(target.dataset.index);

                if (action === 'toggle-detail') {
                    const detailEl = document.getElementById(`step-detail-${index}`);
                    if (detailEl) {
                        const isHidden = detailEl.style.display === 'none';
                        detailEl.style.display = isHidden ? 'block' : 'none';
                        target.textContent = isHidden ? '▲' : '▼';
                        target.title = isHidden ? '詳細を隠す' : '詳細を表示';
                    }
                } else if (action === 'delete') {
                    this.deleteStep(index);
                }
            });

            // Detail save button
            stepsList.addEventListener('click', (e) => {
                const target = e.target.closest('.detail-save-btn');
                if (!target) return;
                const index = parseInt(target.dataset.index);
                this.saveDetailEdit(index);
            });

            // Auto-save on blur for detail textareas
            stepsList.addEventListener('blur', (e) => {
                const textarea = e.target.closest('.detail-instruction, .detail-comment');
                if (!textarea) return;
                const index = parseInt(textarea.dataset.index);
                // Don't re-render, just update the data model
                const steps = window.app.state.currentSop.steps;
                if (steps[index]) {
                    const detailEl = document.getElementById(`step-detail-${index}`);
                    if (detailEl) {
                        const instTextarea = detailEl.querySelector('.detail-instruction');
                        const commentTextarea = detailEl.querySelector('.detail-comment');
                        if (instTextarea) {
                            steps[index].instruction = instTextarea.value.trim() || steps[index].instruction;
                        }
                        if (commentTextarea) {
                            steps[index].comment = commentTextarea.value.trim();
                        }
                        // Update preview text
                        const stepItem = detailEl.closest('.step-item');
                        if (stepItem) {
                            const preview = stepItem.querySelector('.step-preview');
                            if (preview) preview.textContent = steps[index].instruction || '（未入力）';
                        }
                    }
                }
            }, true);

            // Inline edit: double-click on step preview
            stepsList.addEventListener('dblclick', (e) => {
                const stepItem = e.target.closest('.step-item');
                if (!stepItem || stepItem.classList.contains('editing')) return;
                const index = parseInt(stepItem.dataset.index);
                this.startInlineEdit(index);
            });
        }

        // Step form events
        const form = document.getElementById('step-form');
        if (form) {
            form.addEventListener('click', (e) => {
                if (e.target.id === 'cancel-step-btn') {
                    this.closeStepForm();
                } else if (e.target.id === 'save-step-btn') {
                    this.saveStep();
                }
            });
        }
    },

    // Start inline editing for a step
    startInlineEdit: function(index) {
        const stepsList = document.getElementById('steps-list');
        const stepItem = stepsList.querySelector(`.step-item[data-index="${index}"]`);
        if (!stepItem) return;

        const step = window.app.state.currentSop.steps[index];
        if (!step) return;

        // Close any other inline edit
        const editing = stepsList.querySelector('.step-item.editing');
        if (editing) {
            this.cancelInlineEdit(parseInt(editing.dataset.index));
        }

        stepItem.classList.add('editing');
        stepItem.draggable = false;

        const editArea = document.createElement('div');
        editArea.className = 'inline-edit-area';
        editArea.innerHTML = `
            <textarea placeholder="作業指示内容を入力">${this.escapeHtml(step.instruction)}</textarea>
            <div class="inline-edit-actions">
                <button class="inline-save-btn" data-index="${index}">保存</button>
                <button class="secondary inline-cancel-btn" data-index="${index}">キャンセル</button>
            </div>
        `;
        stepItem.appendChild(editArea);

        // Focus the textarea
        const textarea = editArea.querySelector('textarea');
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        // Save on Ctrl+Enter
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.saveInlineEdit(index);
            }
            if (e.key === 'Escape') {
                this.cancelInlineEdit(index);
            }
        });

        // Button events
        editArea.querySelector('.inline-save-btn').addEventListener('click', () => {
            this.saveInlineEdit(index);
        });
        editArea.querySelector('.inline-cancel-btn').addEventListener('click', () => {
            this.cancelInlineEdit(index);
        });
    },

    // Save inline edit
    saveInlineEdit: function(index) {
        const stepsList = document.getElementById('steps-list');
        const stepItem = stepsList.querySelector(`.step-item[data-index="${index}"]`);
        if (!stepItem) return;

        const textarea = stepItem.querySelector('.inline-edit-area textarea');
        if (!textarea) return;

        const instruction = textarea.value.trim();
        if (!instruction) {
            alert('作業指示内容を入力してください。');
            return;
        }

        const step = window.app.state.currentSop.steps[index];
        step.instruction = instruction;

        // Update preview
        const preview = stepItem.querySelector('.step-preview');
        if (preview) {
            preview.textContent = instruction;
        }

        // Remove editing state
        stepItem.classList.remove('editing');
        stepItem.draggable = true;
        const editArea = stepItem.querySelector('.inline-edit-area');
        if (editArea) editArea.remove();
    },

    // Cancel inline edit
    cancelInlineEdit: function(index) {
        const stepsList = document.getElementById('steps-list');
        const stepItem = stepsList.querySelector(`.step-item[data-index="${index}"]`);
        if (!stepItem) return;

        stepItem.classList.remove('editing');
        stepItem.draggable = true;
        const editArea = stepItem.querySelector('.inline-edit-area');
        if (editArea) editArea.remove();
    },

    // Attach drag and drop events
    attachDragEvents: function() {
        const items = document.querySelectorAll('.step-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.index);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                item.classList.add('drag-over');
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = parseInt(item.dataset.index);

                if (fromIndex !== toIndex) {
                    this.reorderSteps(fromIndex, toIndex);
                }

                item.classList.remove('drag-over');
            });
        });
    },

    // Reorder steps
    reorderSteps: function(fromIndex, toIndex) {
        const steps = window.app.state.currentSop.steps;
        const [movedStep] = steps.splice(fromIndex, 1);
        steps.splice(toIndex, 0, movedStep);

        // Update step_index values
        steps.forEach((step, index) => {
            step.step_index = index + 1;
        });

        this.renderStepsList();
    },

    // Add new step - only adds ONE step per call
    addStep: function() {
        this.currentStepIndex = null;
        this.currentImages = [];
        this.openStepForm({
            instruction: '',
            comment: '',
            images: [],
            media_enabled: true,
            require_time: true,
            require_judgment: true,
            skip_enabled: true
        });
    },

    // Edit step
    editStep: function(index) {
        const step = window.app.state.currentSop.steps[index];
        this.currentStepIndex = index;
        this.currentImages = step.images ? [...step.images] : [];
        this.openStepForm(step);
    },

    // Delete step
    deleteStep: function(index) {
        if (confirm('ステップ' + (index + 1) + 'を削除しますか？')) {
            window.app.state.currentSop.steps.splice(index, 1);
            
            // Update step_index values
            window.app.state.currentSop.steps.forEach((step, i) => {
                step.step_index = i + 1;
            });

            this.renderStepsList();
        }
    },

    // Open step form (modal)
    openStepForm: function(stepData) {
        document.getElementById('step-instruction').value = stepData.instruction || '';
        document.getElementById('step-comment').value = stepData.comment || '';
        
        // Store current images for this step
        this.currentImages = stepData.images ? [...stepData.images] : [];
        this.renderImageThumbnails();

        const modalOverlay = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');
        modalContent.classList.add('step-form-modal');
        modalOverlay.style.display = 'flex';
    },

    // Close step form (modal)
    closeStepForm: function() {
        const modalOverlay = document.getElementById('modal-overlay');
        modalOverlay.style.display = 'none';
        this.currentStepIndex = null;
    },

    // Save step - fixes duplication bug: only updates or adds ONE step
    saveStep: function() {
        const instruction = document.getElementById('step-instruction').value.trim();
        const comment = document.getElementById('step-comment').value.trim();
        
        if (!instruction) {
            alert('作業指示内容を入力してください。');
            return;
        }

        const stepData = {
            step_index: this.currentStepIndex !== null ? this.currentStepIndex + 1 : window.app.state.currentSop.steps.length + 1,
            instruction: instruction,
            comment: comment,
            images: this.currentImages || [],
            media_enabled: true,
            require_time: true,
            require_judgment: true,
            skip_enabled: true
        };

        if (this.currentStepIndex !== null) {
            // Update existing step only - no new step creation
            window.app.state.currentSop.steps[this.currentStepIndex] = stepData;
        } else {
            // Add exactly ONE new step
            window.app.state.currentSop.steps.push(stepData);
        }

        this.closeStepForm();
        this.renderStepsList();
    },

    // Save SOP
    saveSop: function() {
        const title = document.getElementById('sop-title').value.trim();
        
        if (!title) {
            alert('SOPタイトルを入力してください。');
            return;
        }

        window.app.state.currentSop.sop_title = title;
        window.app.state.currentSop.updated_at = new Date().toISOString();

        // Save to localStorage (multiple SOPs management)
        try {
            let templates = JSON.parse(localStorage.getItem('sop_templates') || '[]');
            const existingIndex = templates.findIndex(t => t.sop_id === window.app.state.currentSop.sop_id);
            
            if (existingIndex >= 0) {
                templates[existingIndex] = window.Utils.deepClone(window.app.state.currentSop);
            } else {
                templates.push(window.Utils.deepClone(window.app.state.currentSop));
            }
            
            localStorage.setItem('sop_templates', JSON.stringify(templates));
            localStorage.setItem('currentSop', JSON.stringify(window.app.state.currentSop));
            alert('SOPを保存しました。');
        } catch (e) {
            alert('保存に失敗しました: ' + e.message);
        }
    },

    // Open preview
    openPreview: function() {
        if (window.app.state.currentSop.steps.length === 0) {
            alert('プレビューするステップがありません。');
            return;
        }
        Player.startPreview();
    },

    // Add image to current step (modal)
    addImage: function(base64) {
        if (!this.currentImages) {
            this.currentImages = [];
        }
        this.currentImages.push(base64);
        this.renderImageThumbnails();
    },

    // Add image to detail view
    addDetailImage: function(stepIndex, base64) {
        const steps = window.app.state.currentSop.steps;
        if (!steps[stepIndex]) return;
        if (!steps[stepIndex].images) {
            steps[stepIndex].images = [];
        }
        steps[stepIndex].images.push(base64);
        
        // Re-render just the detail image thumbnails
        const container = document.getElementById(`detail-image-thumbnails-${stepIndex}`);
        if (container) {
            container.innerHTML = steps[stepIndex].images.map((img, idx) => `
                <div style="position:relative;">
                    <img src="${img}" class="image-thumbnail" alt="画像${idx + 1}" onclick="Admin.openImagePreview('${img}')">
                    <button class="danger" style="position:absolute;top:-8px;right:-8px;padding:4px 8px;font-size:9pt;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;" onclick="Admin.removeDetailImage(${stepIndex}, ${idx})">×</button>
                </div>
            `).join('');
        }
    },

    // Remove image from current step (modal)
    removeImage: function(index) {
        if (this.currentImages) {
            this.currentImages.splice(index, 1);
            this.renderImageThumbnails();
        }
    },

    // Render image thumbnails (modal)
    renderImageThumbnails: function() {
        const container = document.getElementById('image-thumbnails');
        if (!container) return;

        if (!this.currentImages || this.currentImages.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this.currentImages.map((img, index) => `
            <div style="position:relative;">
                <img src="${img}" class="image-thumbnail" alt="画像${index + 1}" onclick="Admin.openImagePreview('${img}')">
                <button class="danger" style="position:absolute;top:-8px;right:-8px;padding:4px 8px;font-size:9pt;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;" onclick="Admin.removeImage(${index})">×</button>
            </div>
        `).join('');
    },

    // Open image preview (enlarge)
    openImagePreview: function(src) {
        const existing = document.querySelector('.image-preview-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'image-preview-overlay';
        overlay.innerHTML = `<img src="${src}" alt="プレビュー">`;
        overlay.addEventListener('click', () => overlay.remove());
        document.body.appendChild(overlay);
    },

    // Save detail edit (from expandable inline editor)
    saveDetailEdit: function(index) {
        const detailEl = document.getElementById(`step-detail-${index}`);
        if (!detailEl) return;
        
        const steps = window.app.state.currentSop.steps;
        if (!steps[index]) return;
        
        const instTextarea = detailEl.querySelector('.detail-instruction');
        const commentTextarea = detailEl.querySelector('.detail-comment');
        
        if (instTextarea) {
            const val = instTextarea.value.trim();
            if (val) {
                steps[index].instruction = val;
            }
        }
        if (commentTextarea) {
            steps[index].comment = commentTextarea.value.trim();
        }
        
        // Update preview text
        const stepItem = detailEl.closest('.step-item');
        if (stepItem) {
            const preview = stepItem.querySelector('.step-preview');
            if (preview) preview.textContent = steps[index].instruction || '（未入力）';
        }
    },

    // Remove image from detail view
    removeDetailImage: function(stepIndex, imgIndex) {
        const steps = window.app.state.currentSop.steps;
        if (!steps[stepIndex] || !steps[stepIndex].images) return;
        steps[stepIndex].images.splice(imgIndex, 1);
        
        // Re-render just the detail image thumbnails
        const container = document.getElementById(`detail-image-thumbnails-${stepIndex}`);
        if (container) {
            const images = steps[stepIndex].images;
            if (!images || images.length === 0) {
                container.innerHTML = '';
                return;
            }
            container.innerHTML = images.map((img, idx) => `
                <div style="position:relative;">
                    <img src="${img}" class="image-thumbnail" alt="画像${idx + 1}" onclick="Admin.openImagePreview('${img}')">
                    <button class="danger" style="position:absolute;top:-8px;right:-8px;padding:4px 8px;font-size:9pt;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;" onclick="Admin.removeDetailImage(${stepIndex}, ${idx})">×</button>
                </div>
            `).join('');
        }
    },

    // Escape HTML
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Make Admin globally accessible
window.Admin = Admin;