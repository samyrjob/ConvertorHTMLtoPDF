// ========================================
// HTML to PDF Converter - JavaScript
// Ultra-Clean Minimal Design
// ========================================

// ========================================
// DOM Elements
// ========================================

// Tab elements
const tabButtons = document.querySelectorAll('.tab-btn');
const pasteTab = document.getElementById('paste-tab');
const uploadTab = document.getElementById('upload-tab');

// Form elements
const htmlInput = document.getElementById('html-input');
const fileInput = document.getElementById('file-input');
const uploadArea = document.getElementById('upload-area');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const clearFileBtn = document.getElementById('clear-file');

// PDF Options
const pageSizeSelect = document.getElementById('page-size');
const orientationSelect = document.getElementById('orientation');

// Preview
const previewFrame = document.getElementById('preview-frame');

// Convert button and status
const convertBtn = document.getElementById('convert-btn');
const statusContainer = document.getElementById('status-container');

// ========================================
// Tab Switching
// ========================================

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Update active states
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.classList.add('button-outline');
        });
        button.classList.add('active');
        button.classList.remove('button-outline');
        
        // Show/hide tab content
        if (targetTab === 'paste') {
            pasteTab.classList.add('active');
            uploadTab.classList.remove('active');
        } else {
            uploadTab.classList.add('active');
            pasteTab.classList.remove('active');
        }
    });
});

// ========================================
// File Upload with Drag & Drop
// ========================================

// Click to browse
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

// File selected
fileInput.addEventListener('change', (e) => {
    handleFileSelect(e.target.files[0]);
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm'))) {
        handleFileSelect(file);
    } else {
        showStatus('Please upload an HTML file (.html or .htm)', 'error');
    }
});

// Handle file selection
function handleFileSelect(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        htmlInput.value = e.target.result;
        fileName.textContent = file.name;
        fileInfo.classList.add('active');
        updatePreview();
        showStatus(`File loaded: ${file.name}`, 'success');
    };
    reader.readAsText(file);
}

// Clear file
clearFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.value = '';
    fileName.textContent = '';
    fileInfo.classList.remove('active');
});

// ========================================
// Live Preview
// ========================================

// Update preview when HTML changes
htmlInput.addEventListener('input', debounce(() => {
    updatePreview();
}, 500));

function updatePreview() {
    const htmlContent = htmlInput.value.trim();
    if (htmlContent) {
        const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
        previewDoc.open();
        previewDoc.write(htmlContent);
        previewDoc.close();
    } else {
        const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
        previewDoc.open();
        previewDoc.write('<p style="text-align: center; color: #999; padding: 2rem;">Preview will appear here...</p>');
        previewDoc.close();
    }
}

// Debounce helper function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========================================
// PDF Conversion
// ========================================

convertBtn.addEventListener('click', async () => {
    const htmlContent = htmlInput.value.trim();
    
    // Validation
    if (!htmlContent) {
        showStatus('Please enter or upload HTML content first!', 'error');
        return;
    }
    
    // Get PDF options
    const pageSize = pageSizeSelect.value;
    const orientation = orientationSelect.value;
    
    // Disable button and show loading
    convertBtn.disabled = true;
    const originalButtonText = convertBtn.textContent;
    convertBtn.innerHTML = '<span class="spinner"></span> Converting to PDF...';
    showStatus('<span class="spinner"></span> Converting HTML to PDF... Please wait.', 'info');
    
    try {
        // Call Azure Function API
        const response = await fetch('/api/convert_to_pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                html: htmlContent,
                filename: 'converted.pdf',
                page_size: pageSize,
                orientation: orientation
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Convert base64 to blob
            const pdfBlob = base64ToBlob(data.pdf_base64, 'application/pdf');
            
            // Create download link
            const url = window.URL.createObjectURL(pdfBlob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `converted-${Date.now()}.pdf`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(downloadLink);
            
            // Show success message
            showStatus(
                `✅ PDF generated successfully! File size: ${data.size_kb} KB`,
                'success'
            );
        } else {
            // Show error message
            showStatus(
                `❌ Conversion failed: ${data.error || 'Unknown error occurred'}`,
                'error'
            );
        }
    } catch (error) {
        console.error('Conversion error:', error);
        showStatus(
            `❌ Network error: ${error.message}. Please check your connection and try again.`,
            'error'
        );
    } finally {
        // Re-enable button and restore original text
        convertBtn.disabled = false;
        convertBtn.textContent = originalButtonText;
    }
});

// ========================================
// Helper Functions
// ========================================

/**
 * Display a status message to the user
 * @param {string} message - The message to display
 * @param {string} type - Message type: 'success', 'error', or 'info'
 */
function showStatus(message, type) {
    // Clear existing messages
    statusContainer.innerHTML = '';
    
    // Create status message
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message visible status-${type}`;
    statusDiv.innerHTML = message;
    
    statusContainer.appendChild(statusDiv);
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.classList.remove('visible');
            setTimeout(() => {
                statusDiv.remove();
            }, 300);
        }, 5000);
    }
}

/**
 * Convert base64 string to Blob
 * @param {string} base64 - Base64 encoded string
 * @param {string} mimeType - MIME type of the blob
 * @returns {Blob} - The resulting blob
 */
function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

// ========================================
// Example HTML Templates
// ========================================

const EXAMPLE_CV_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional CV</title>
    <style>
        @page { size: A4; margin: 15mm; }
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .header h1 { font-size: 24pt; margin: 0 0 5px 0; }
        .header p { margin: 3px 0; color: #666; }
        .section { margin-bottom: 20px; }
        .section h2 {
            font-size: 14pt;
            border-bottom: 1px solid #333;
            padding-bottom: 3px;
            margin-bottom: 10px;
        }
        .job { margin-bottom: 15px; }
        .job-title { font-weight: bold; }
        .job-date { font-style: italic; color: #666; }
        ul { margin: 5px 0; padding-left: 20px; }
        li { margin-bottom: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>John Doe</h1>
        <p>Email: john.doe@email.com | Phone: +1 234 567 8900</p>
        <p>Location: San Francisco, CA</p>
    </div>

    <div class="section">
        <h2>Professional Experience</h2>
        <div class="job">
            <div class="job-title">Senior Software Engineer - Tech Company</div>
            <div class="job-date">January 2020 - Present</div>
            <ul>
                <li>Led development of microservices architecture serving 1M+ users</li>
                <li>Implemented CI/CD pipeline reducing deployment time by 60%</li>
                <li>Mentored team of 5 junior developers</li>
            </ul>
        </div>
    </div>

    <div class="section">
        <h2>Education</h2>
        <div class="job">
            <div class="job-title">BSc Computer Science</div>
            <div class="job-date">University of California | 2015 - 2019</div>
        </div>
    </div>

    <div class="section">
        <h2>Skills</h2>
        <ul>
            <li><strong>Languages:</strong> Python, JavaScript, TypeScript, Go</li>
            <li><strong>Frameworks:</strong> React, Node.js, Django, FastAPI</li>
            <li><strong>Tools:</strong> Docker, Kubernetes, AWS, Git</li>
        </ul>
    </div>
</body>
</html>`;

// ========================================
// Keyboard Shortcuts
// ========================================

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to convert
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        convertBtn.click();
    }
    
    // Ctrl/Cmd + Shift + E to load example
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        htmlInput.value = EXAMPLE_CV_HTML;
        updatePreview();
        showStatus('Example CV loaded!', 'success');
    }
});

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ HTML to PDF Converter initialized');
    console.log('💡 Keyboard shortcuts:');
    console.log('   - Ctrl/Cmd + Enter: Convert to PDF');
    console.log('   - Ctrl/Cmd + Shift + E: Load example CV');
    
    // Initialize preview with empty state
    updatePreview();
});