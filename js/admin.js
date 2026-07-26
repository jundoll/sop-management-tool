// Admin View Module for SOP Management System

const Admin = {
    currentStepIndex: null,

    // Initialize admin view
    init: function() {
        this.currentStepIndex = null;
        this.renderStepsList();
        this.setupEventListeners();
    },

    // Render steps list
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
                <span class="step-index">${index + 1}</span>
                <span class="step-preview">${this.escapeHtml(step.instruction) || '（未入力）'}</span>
                <div class="step-actions">
                    <button class="secondary" data-action="edit" data-index="${index}">編集</button>
                    <button class="danger" data-action="delete" data-index="${index}">削除</button>
                </div>
            `;
            stepsList.appendChild(li);
        });

        // Attach drag and drop events
        this.attachDragEvents();
    },

    // Setup event listeners
    setupEventListeners: function() {
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

        // Paste handler for reference images
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

                if (action === 'edit') {
                    this.editStep(index);
                } else if (action === 'delete') {
                    this.deleteStep(index);
                }
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

    // Add new step
    addStep: function() {
        this.currentStepIndex = null;
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

    // Open step form
    openStepForm: function(stepData) {
        const form = document.getElementById('step-form');
        if (!form) return;

        document.getElementById('step-instruction').value = stepData.instruction || '';
        document.getElementById('step-comment').value = stepData.comment || '';
        
        // Store current images for this step
        this.currentImages = stepData.images || [];
        this.renderImageThumbnails();

        form.classList.add('open');
    },

    // Close step form
    closeStepForm: function() {
        const form = document.getElementById('step-form');
        if (form) {
            form.classList.remove('open');
        }
        this.currentStepIndex = null;
    },

    // Save step
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
            // Update existing step (fix duplication bug)
            window.app.state.currentSop.steps[this.currentStepIndex] = stepData;
        } else {
            // Add new step
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

    // Add image to current step
    addImage: function(base64) {
        if (!this.currentImages) {
            this.currentImages = [];
        }
        this.currentImages.push(base64);
        this.renderImageThumbnails();
    },

    // Remove image from current step
    removeImage: function(index) {
        if (this.currentImages) {
            this.currentImages.splice(index, 1);
            this.renderImageThumbnails();
        }
    },

    // Render image thumbnails
    renderImageThumbnails: function() {
        const container = document.getElementById('image-thumbnails');
        if (!container) return;

        if (!this.currentImages || this.currentImages.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this.currentImages.map((img, index) => `
            <div style="position:relative;">
                <img src="${img}" class="image-thumbnail" alt="画像${index + 1}">
                <button class="danger" style="position:absolute;top:-8px;right:-8px;padding:4px 8px;font-size:9pt;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;" onclick="Admin.removeImage(${index})">×</button>
            </div>
        `).join('');
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