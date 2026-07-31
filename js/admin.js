// Admin View Module for SOP Management System

const Admin = {
    currentStepIndex: null,
    currentImages: [],
    _listenersAttached: false,

    // Update save button disabled state based on changes
    updateSaveButtonState: function(enable) {
        const saveBtn = document.getElementById('save-sop-btn');
        if (saveBtn) {
            saveBtn.disabled = !enable;
        }
    },

    // Update detail save button disabled state based on changes
    updateDetailSaveButtonState: function(index, enable) {
        const detailEl = document.getElementById(`step-detail-${index}`);
        if (!detailEl) return;
        const saveBtn = detailEl.querySelector('.detail-save-btn');
        if (saveBtn) {
            saveBtn.disabled = !enable;
        }
    },

    // Initialize admin view
    init: function() {
        this.currentStepIndex = null;
        this.currentImages = [];
        // Reset listener attachment flag so handlers re-bind after DOM recreation
        this._listenersAttached = false;
        this.renderStepsList();
        this.setupEventListeners();
        // Initially disable save button until changes are made
        this.updateSaveButtonState(false);
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
                    <span class="step-preview">${this.escapeHtml(step.instruction) || '（未入力）'}</span>
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
                            <div style="margin-bottom:8px;">
                                <div class="checkbox-group">
                                    <input type="checkbox" class="detail-evidence-required" data-index="${index}" ${step.evidence_required ? 'checked' : ''}>
                                    <label style="font-size:10pt;font-weight:600;color:var(--gray-500);margin-bottom:0;">エビデンスを取得する</label>
                                </div>
                                <input type="text" class="detail-evidence-description" data-index="${index}" value="${this.escapeHtml(step.evidence_description || '')}" placeholder="エビデンスの説明（例：画面キャプチャ、測定値など）" style="width:100%;font-size:10pt;padding:6px;border:1px solid var(--gray-300);border-radius:var(--radius-sm);margin-top:4px;">
                            </div>
                            <div class="detail-actions" style="display:flex;gap:8px;margin-top:8px;">
                                <button class="detail-save-btn" data-index="${index}" disabled><span class="material-icons">save</span></button>
                                <button class="secondary detail-cancel-btn" data-index="${index}"><span class="material-icons">close</span></button>
                                <button class="danger detail-delete-btn" data-index="${index}"><span class="material-icons">delete</span></button>
                            </div>
                        </div>
                        <div class="step-detail-right">
                            <label style="font-size:10pt;font-weight:600;color:var(--gray-500);display:block;margin-bottom:4px;">参考画像</label>
                            <div class="image-upload-area" id="detail-image-upload-${index}" data-step="${index}" tabindex="0">
                                <div class="paste-hint" style="font-size:9pt;">Ctrl+V で画像を貼り付け</div>
                                <div class="image-thumbnails" id="detail-image-thumbnails-${index}">
                                    ${step.images && step.images.length > 0 ? step.images.map((img, idx) => `
                                        <div style="position:relative;display:inline-block;">
                                            <span class="image-number-label">${idx + 1}</span>
                                            <img src="${img}" class="image-thumbnail" alt="画像${idx + 1}" onclick="Admin.openImagePreview('${img}')">
                                            <button class="detail-image-delete-btn danger" data-step-index="${index}" data-img-index="${idx}" style="position:absolute;top:-8px;right:-8px;padding:0;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;line-height:1;"><span class="material-icons" style="font-size:16px;margin:0;">delete</span></button>
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
        
            // Ensure paste handlers are attached to all detail image upload areas
            if (this._attachDetailPasteHandlers) {
                this._attachDetailPasteHandlers();
            }
    },

    // Setup event listeners
    setupEventListeners: function() {
        if (this._listenersAttached) return;
        this._listenersAttached = true;

        const addBtn = document.getElementById('add-step-btn');
        const saveBtn = document.getElementById('save-sop-btn');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.addStep());
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSop());
        }

        // Step list click events (delegation)
        const stepsList = document.getElementById('steps-list');
        if (stepsList) {
            // Step item click to toggle detail
            stepsList.addEventListener('click', (e) => {
                const stepItem = e.target.closest('.step-item');
                if (!stepItem) return;
                
                // Ignore clicks on buttons - handled by other listeners
                if (e.target.closest('button')) return;
                
                const index = parseInt(stepItem.dataset.index);
                const detailEl = document.getElementById(`step-detail-${index}`);
                if (!detailEl) return;
                
                const isHidden = detailEl.style.display === 'none';
                
                if (!isHidden) {
                    // Only close when clicking on the header area (step-item-left)
                    if (e.target.closest('.step-item-left')) {
                        detailEl.style.display = 'none';
                        stepItem.classList.remove('editing');
                    }
                    return;
                }
                
                // Open detail if it's hidden and mark as editing
                detailEl.style.display = 'block';
                stepItem.classList.add('editing');
                
                // Attach paste handler for this detail area after it becomes visible
                setTimeout(() => {
                    const uploadArea = document.getElementById(`detail-image-upload-${index}`);
                    if (uploadArea) {
                        // Only attach if not already attached to prevent duplicate handlers
                        if (!uploadArea.dataset.pasteAttached) {
                            uploadArea.dataset.pasteAttached = 'true';
                            Utils.handlePaste(uploadArea, 1280, 0.8, (base64) => {
                                this.addDetailImage(index, base64);
                            });
                        }
                    }
                }, 100);
            });

            // Left delete button in step-item (legacy, may be removed after CSS update)
            stepsList.addEventListener('click', (e) => {
                const target = e.target.closest('button[data-action="delete"]');
                if (!target) return;
                e.stopPropagation();
                const index = parseInt(target.dataset.index);
                this.deleteStep(index);
            });

            // Detail delete button
            stepsList.addEventListener('click', (e) => {
                const target = e.target.closest('.detail-delete-btn');
                if (!target) return;
                e.stopPropagation();
                const index = parseInt(target.dataset.index);
                this.deleteStep(index);
            });

            // Detail save button
            stepsList.addEventListener('click', (e) => {
                const target = e.target.closest('.detail-save-btn');
                if (!target) return;
                e.stopPropagation();
                const index = parseInt(target.dataset.index);
                this.saveDetailEdit(index);
            });

            // Detail cancel button - restore original values
            stepsList.addEventListener('click', (e) => {
                const target = e.target.closest('.detail-cancel-btn');
                if (!target) return;
                e.stopPropagation();
                const index = parseInt(target.dataset.index);
                this.restoreDetailEdit(index);
            });

            // Image delete buttons
            stepsList.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.detail-image-delete-btn');
                if (!deleteBtn) return;
                e.stopPropagation();
                const stepIndex = parseInt(deleteBtn.dataset.stepIndex);
                const imgIndex = parseInt(deleteBtn.dataset.imgIndex);
                this.removeDetailImage(stepIndex, imgIndex);
            });

            // Enable save button when detail inputs are modified
            stepsList.addEventListener('input', (e) => {
                const textarea = e.target.closest('.detail-instruction, .detail-comment, .detail-evidence-description');
                if (!textarea) return;
                this.updateSaveButtonState(true);
                // Enable the detail save button for the current step
                const stepItem = textarea.closest('.step-item');
                if (stepItem) {
                    const idx = parseInt(stepItem.dataset.index);
                    this.updateDetailSaveButtonState(idx, true);
                }
            });
            
            // Enable save button when checkbox is changed
            stepsList.addEventListener('change', (e) => {
                const checkbox = e.target.closest('.detail-evidence-required');
                if (!checkbox) return;
                this.updateSaveButtonState(true);
                // Enable the detail save button for the current step
                const stepItem = checkbox.closest('.step-item');
                if (stepItem) {
                    const idx = parseInt(stepItem.dataset.index);
                    this.updateDetailSaveButtonState(idx, true);
                }
            });

            // Inline error display for required instruction field
            stepsList.addEventListener('input', (e) => {
                const inst = e.target.closest('.detail-instruction');
                if (!inst) return;
                const stepItem = inst.closest('.step-item');
                if (!stepItem) return;
                const idx = parseInt(stepItem.dataset.index);
                if (!inst.value.trim()) {
                    this.showInlineError(idx, '作業指示内容は必須です');
                } else {
                    this.clearInlineError(idx);
                }
            });
        }

        // Paste handler for reference images (modal) - if elements exist
        const imageUploadArea = document.getElementById('image-upload-area');
        if (imageUploadArea) {
            Utils.handlePaste(imageUploadArea, 1280, 0.8, (base64) => {
                this.addImage(base64);
            });
        }

        // Attach paste handlers for detail image upload areas after rendering
        this._attachDetailPasteHandlers = () => {
            const steps = window.app.state.currentSop.steps;
            steps.forEach((step, index) => {
                const uploadArea = document.getElementById(`detail-image-upload-${index}`);
                if (uploadArea && !uploadArea.dataset.pasteAttached) {
                    uploadArea.dataset.pasteAttached = 'true';
                    Utils.handlePaste(uploadArea, 1280, 0.8, (base64) => {
                        Admin.addDetailImage(index, base64);
                    });
                }
            });
        };
    },

    // Start inline editing for a step
    startInlineEdit: function(index) {
        const stepsList = document.getElementById('steps-list');
        const stepItem = stepsList.querySelector(`.step-item[data-index="${index}"]`);
        if (!stepItem) return;

        const step = window.app.state.currentSop.steps[index];
        if (!step) return;

        // Close any other open detail area first
        const openDetail = stepsList.querySelector('.step-detail[style*="block"]');
        if (openDetail) {
            openDetail.style.display = 'none';
        }

        // Ensure step-item editing state without hiding step-index
        stepItem.classList.add('editing');
        stepItem.draggable = false;

        const editArea = document.createElement('div');
        editArea.className = 'inline-edit-area';
        editArea.innerHTML = `
            <textarea placeholder="作業指示内容を入力">${this.escapeHtml(step.instruction)}</textarea>
            <div class="inline-edit-actions">
                <button class="inline-save-btn" data-index="${index}"><span class="material-icons">save</span></button>
                <button class="secondary inline-cancel-btn" data-index="${index}"><span class="material-icons">close</span></button>
            </div>
        `;
        stepItem.appendChild(editArea);

        const textarea = editArea.querySelector('textarea');
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.saveInlineEdit(index);
            }
            if (e.key === 'Escape') {
                this.cancelInlineEdit(index);
            }
        });

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

    // Add new step - adds directly to list without modal, auto-expands detail area
    addStep: function() {
        // Create new empty step at the end
        const newIndex = window.app.state.currentSop.steps.length;
        const newStep = {
            step_index: newIndex + 1,
            instruction: '',
            comment: '',
            images: [],
            media_enabled: true,
            require_time: true,
            require_judgment: true,
            skip_enabled: true,
            evidence_required: false,
            evidence_description: ''
        };
        window.app.state.currentSop.steps.push(newStep);
        this.renderStepsList();
        
        // Automatically open detail area for the new step (all fields accessible)
        setTimeout(() => {
            const detailEl = document.getElementById(`step-detail-${newIndex}`);
            if (detailEl) {
                detailEl.style.display = 'block';
            }
        }, 50);
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
            
            // Close detail area after deletion
            const detailEl = document.getElementById(`step-detail-${index}`);
            if (detailEl) {
                detailEl.style.display = 'none';
            }
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
        const evidenceRequired = document.getElementById('step-evidence-required').checked;
        const evidenceDescription = document.getElementById('step-evidence-description').value.trim();
        
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
            skip_enabled: true,
            evidence_required: evidenceRequired,
            evidence_description: evidenceDescription
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
            // Disable save button after successful save
            this.updateSaveButtonState(false);
        } catch (e) {
            alert('保存に失敗しました: ' + e.message);
        }
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
                <div style="position:relative;display:inline-block;">
                    <span class="image-number-label">${idx + 1}</span>
                    <img src="${img}" class="image-thumbnail" alt="画像${idx + 1}" onclick="Admin.openImagePreview('${img}')">
                    <button class="danger" style="position:absolute;top:-8px;right:-8px;padding:0;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;line-height:1;" onclick="Admin.removeDetailImage(${stepIndex}, ${idx})"><span class="material-icons" style="font-size:16px;margin:0;">delete</span></button>
                </div>
            `).join('');
        }
        
        // Enable save button due to content change
        this.updateSaveButtonState(true);
        this.updateDetailSaveButtonState(stepIndex, true);
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
            <div style="position:relative;display:inline-block;">
                <span class="image-number-label">${index + 1}</span>
                <img src="${img}" class="image-thumbnail" alt="画像${index + 1}" onclick="Admin.openImagePreview('${img}')">
                <button class="danger" style="position:absolute;top:-8px;right:-8px;padding:0;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;" onclick="Admin.removeImage(${index})"><span class="material-icons" style="font-size:16px;margin:0;">delete</span></button>
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
        const evidenceRequiredCheckbox = detailEl.querySelector('.detail-evidence-required');
        const evidenceDescriptionInput = detailEl.querySelector('.detail-evidence-description');
        
        if (instTextarea) {
            const val = instTextarea.value.trim();
            if (!val) {
                this.showInlineError(index, '作業指示内容は必須です');
                return;
            } else {
                this.clearInlineError(index);
            }
            steps[index].instruction = val;
        }
        if (commentTextarea) {
            steps[index].comment = commentTextarea.value.trim();
        }
        if (evidenceRequiredCheckbox) {
            steps[index].evidence_required = evidenceRequiredCheckbox.checked;
        }
        if (evidenceDescriptionInput) {
            steps[index].evidence_description = evidenceDescriptionInput.value.trim();
        }
        
        // Update preview text
        const stepItem = detailEl.closest('.step-item');
        if (stepItem) {
            const preview = stepItem.querySelector('.step-preview');
            if (preview) preview.textContent = steps[index].instruction || '（未入力）';
        }
        
        // After saving, disable detail save button until next change
        this.updateDetailSaveButtonState(index, false);
        // Enable global save button
        this.updateSaveButtonState(true);
        
        // Close detail area after saving (feedback #22)
        detailEl.style.display = 'none';
    },

    // Restore detail edit (cancel button)
    restoreDetailEdit: function(index) {
        const detailEl = document.getElementById(`step-detail-${index}`);
        if (!detailEl) return;
        
        const steps = window.app.state.currentSop.steps;
        if (!steps[index]) return;
        
        const instTextarea = detailEl.querySelector('.detail-instruction');
        const commentTextarea = detailEl.querySelector('.detail-comment');
        const evidenceRequiredCheckbox = detailEl.querySelector('.detail-evidence-required');
        const evidenceDescriptionInput = detailEl.querySelector('.detail-evidence-description');
        
        // Restore original values from data model
        if (instTextarea) {
            instTextarea.value = steps[index].instruction || '';
        }
        if (commentTextarea) {
            commentTextarea.value = steps[index].comment || '';
        }
        if (evidenceRequiredCheckbox) {
            evidenceRequiredCheckbox.checked = steps[index].evidence_required || false;
        }
        if (evidenceDescriptionInput) {
            evidenceDescriptionInput.value = steps[index].evidence_description || '';
        }
        
        // Hide detail area
        detailEl.style.display = 'none';
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
                <div style="position:relative;display:inline-block;">
                    <span class="image-number-label">${idx + 1}</span>
                    <img src="${img}" class="image-thumbnail" alt="画像${idx + 1}" onclick="Admin.openImagePreview('${img}')">
                    <button class="detail-image-delete-btn danger" data-step-index="${stepIndex}" data-img-index="${idx}" style="position:absolute;top:-8px;right:-8px;padding:0;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;"><span class="material-icons" style="font-size:16px;margin:0;">delete</span></button>
                </div>
            `).join('');
        }
        
        // Enable save button due to content change
        this.updateSaveButtonState(true);
        this.updateDetailSaveButtonState(stepIndex, true);
    },

    // Show inline error for required instruction field
    showInlineError: function(index, message) {
        const detailEl = document.getElementById(`step-detail-${index}`);
        if (!detailEl) return;
        const instTextarea = detailEl.querySelector('.detail-instruction');
        if (!instTextarea) return;
        
        // Add error styling to textarea
        instTextarea.style.borderColor = 'var(--danger)';
        instTextarea.style.boxShadow = '0 0 0 3px var(--danger-light)';
        
        // Add error message below textarea if not exists
        const existingError = detailEl.querySelector('.instruction-error');
        if (!existingError) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'instruction-error';
            errorDiv.style.color = 'var(--danger)';
            errorDiv.style.fontSize = '10pt';
            errorDiv.style.fontWeight = '600';
            errorDiv.style.marginTop = '4px';
            errorDiv.textContent = message;
            instTextarea.parentNode.appendChild(errorDiv);
        }
    },

    // Clear inline error for required instruction field
    clearInlineError: function(index) {
        const detailEl = document.getElementById(`step-detail-${index}`);
        if (!detailEl) return;
        const instTextarea = detailEl.querySelector('.detail-instruction');
        if (instTextarea) {
            instTextarea.style.borderColor = 'var(--gray-300)';
            instTextarea.style.boxShadow = 'none';
        }
        const existingError = detailEl.querySelector('.instruction-error');
        if (existingError) existingError.remove();
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