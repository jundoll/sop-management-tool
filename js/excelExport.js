// Excel Export Module for SOP Management System

const ExcelExport = {
    // Export execution data to Excel
    exportToExcel: function(sopData, executionData) {
        try {
            if (typeof XLSX === 'undefined') {
                throw new Error('SheetJSライブラリが読み込まれていません');
            }

            const workbook = XLSX.utils.book_new();
            
            // Create worksheet
            const worksheet = XLSX.utils.aoa_to_sheet([]);
            
            // Set column headers
            const headers = ['No', '作業内容', '実施時刻', '判定', 'スキップ理由', '画像'];
            XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: 'A1' });

            // Add data rows
            let rowIndex = 2;
            const imageColumns = [];

            executionData.steps.forEach((step, index) => {
                const rowData = [
                    index + 1,
                    sopData.steps[index] ? sopData.steps[index].instruction : '',
                    step.time || '',
                    step.judgment || '未判定',
                    step.skip ? (step.skip_reason || '') : '',
                    step.operator_comment || '',
                    ''
                ];

                XLSX.utils.sheet_add_aoa(worksheet, [rowData], { origin: `A${rowIndex}` });

                // Add images if exists (multiple images supported)
                const images = step.images || (step.image_base64 ? [step.image_base64] : []);
                if (images.length > 0) {
                    images.forEach((imgBase64, imgIndex) => {
                        imageColumns.push({
                            row: rowIndex + imgIndex,
                            image: imgBase64,
                            col: 7
                        });
                    });
                    // Adjust rowIndex for images
                    rowIndex += images.length;
                } else {
                    rowIndex++;
                }
            });

            // Set column widths
            worksheet['!cols'] = [
                { wch: 6 },   // No
                { wch: 50 },  // 作業内容
                { wch: 12 },  // 実施時刻
                { wch: 8 },   // 判定
                { wch: 30 },  // スキップ理由
                { wch: 30 },  // コメント
                { wch: 30 }   // 画像
            ];

                // Set worksheet name
            XLSX.utils.book_append_sheet(workbook, worksheet, '履歴');

            // Generate filename
            const filename = `${sopData.sop_title}_${executionData.execution_date}_${executionData.operator_name}.xlsx`;

            // Download file
            XLSX.writeFile(workbook, filename);

            return { success: true, filename: filename };
        } catch (error) {
            console.error('Excel export error:', error);
            return { success: false, error: error.message };
        }
    },

    // Generate execution data from player state
    generateExecutionData: function(sopData, operatorName) {
        const executionData = {
            sop_id: sopData.sop_id,
            sop_title: sopData.sop_title,
            execution_date: Utils.formatDate(),
            operator_name: operatorName,
            steps: []
        };

        // Collect data from each step
        sopData.steps.forEach((step, index) => {
            const stepData = window.app.state.executionData[index] || {};
            executionData.steps.push({
                step_index: index + 1,
                instruction: step.instruction || '',
                time: stepData.time || '',
                judgment: stepData.judgment || '未判定',
                skip: stepData.skip || false,
                skip_reason: stepData.skip_reason || '',
                images: stepData.images || [],
                operator_comment: stepData.comment || ''
            });
        });

        return executionData;
    }
};

// Make ExcelExport globally accessible
window.ExcelExport = ExcelExport;