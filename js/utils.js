// Utility functions for SOP Management System

const Utils = {
    // Generate unique ID using crypto.randomUUID (Edge supported)
    generateId: function() {
        try {
            return 'sop_' + crypto.randomUUID();
        } catch (e) {
            return 'sop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    },

    // Format date to YYYYMMDD
    formatDate: function(date) {
        const d = date || new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return year + month + day;
    },

    // Format time to HH:mm:ss
    formatTime: function(date) {
        const d = date || new Date();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return hours + ':' + minutes + ':' + seconds;
    },

    // Get current timestamp string
    getCurrentTimestamp: function() {
        return this.formatDate() + ' ' + this.formatTime();
    },

    // Debounce function
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Deep clone object
    deepClone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    // Show modal
    showModal: function(title, message, buttons) {
        const overlay = document.getElementById('modal-overlay');
        const content = document.getElementById('modal-content');
        
        let buttonsHtml = '';
        if (buttons && buttons.length > 0) {
            buttonsHtml = '<div class="modal-footer">';
            buttons.forEach(btn => {
                buttonsHtml += `<button class="${btn.class || ''}" data-action="${btn.action}">${btn.text}</button>`;
            });
            buttonsHtml += '</div>';
        }

        content.innerHTML = `
            <div class="modal-header">${title}</div>
            <div class="modal-body">${message}</div>
            ${buttonsHtml}
        `;

        overlay.style.display = 'flex';

        // Attach event listeners to buttons
        if (buttons) {
            const buttonElements = content.querySelectorAll('button[data-action]');
            buttonElements.forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.getAttribute('data-action');
                    this.hideModal();
                    if (buttons && buttons.find(b => b.action === action && b.callback)) {
                        buttons.find(b => b.action === action).callback();
                    }
                });
            });
        }
    },

    // Hide modal
    hideModal: function() {
        const overlay = document.getElementById('modal-overlay');
        overlay.style.display = 'none';
    },

    // Compress image using Canvas
    compressImage: function(file, maxWidth, quality, callback) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                // Create canvas and draw resized image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG
                canvas.toBlob(function(blob) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        callback(e.target.result);
                    };
                    reader.readAsDataURL(blob);
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    // Paste event handler for images
    handlePaste: function(element, maxWidth, quality, callback) {
        element.addEventListener('paste', async function(e) {
            const items = e.clipboardData.items;
            
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    this.compressImage(file, maxWidth, quality, callback);
                    return true;
                }
            }
            return false;
        }.bind(this));
    },

    // Validate SOP template JSON
    validateSopTemplate: function(jsonString) {
        try {
            const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
            
            if (!data.sop_id || typeof data.sop_id !== 'string') {
                throw new Error('sop_idが無効です');
            }
            if (!data.sop_title || typeof data.sop_title !== 'string') {
                throw new Error('sop_titleが無効です');
            }
            if (!Array.isArray(data.steps)) {
                throw new Error('stepsが配列ではありません');
            }

            for (let i = 0; i < data.steps.length; i++) {
                const step = data.steps[i];
                if (typeof step.step_index !== 'number') {
                    throw new Error(`ステップ${i + 1}のstep_indexが無効です`);
                }
                if (typeof step.instruction !== 'string') {
                    throw new Error(`ステップ${i + 1}のinstructionが無効です`);
                }
                if (typeof step.media_enabled !== 'boolean') {
                    throw new Error(`ステップ${i + 1}のmedia_enabledが無効です`);
                }
                if (typeof step.require_time !== 'boolean') {
                    throw new Error(`ステップ${i + 1}のrequire_timeが無効です`);
                }
                if (typeof step.require_judgment !== 'boolean') {
                    throw new Error(`ステップ${i + 1}のrequire_judgmentが無効です`);
                }
                if (typeof step.skip_enabled !== 'boolean') {
                    throw new Error(`ステップ${i + 1}のskip_enabledが無効です`);
                }
            }

            return { valid: true, data: data };
        } catch (e) {
            return { valid: false, error: e.message };
        }
    },

    // Create SOP template structure
    createEmptySop: function() {
        return {
            sop_id: this.generateId(),
            sop_title: '新規SOP',
            steps: []
        };
    },

    // Show warning modal (non-blocking)
    showWarning: function(message) {
        this.showModal('確認', message, [
            { text: 'OK', action: 'ok', class: 'primary' }
        ]);
    },

    // Show error message
    showError: function(message) {
        alert('エラー: ' + message);
    },

    // Network status check
    checkNetwork: function() {
        if (!navigator.onLine) {
            alert('ネットワーク接続が切断されています。復旧後、自動的にデータを送信します。');
            return false;
        }
        return true;
    }
};

// Make Utils globally accessible
window.Utils = Utils;