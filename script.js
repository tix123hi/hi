// Global Variables
let currentText = [];
let annotations = {};
let isRevealMode = false;
let isDarkMode = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
});

/**
 * Handle file upload and parse content
 * @param {Event} event - File input change event
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        
        if (file.name.endsWith('.html')) {
            parseHTMLFile(content);
        } else {
            parseTextFile(content);
        }
        
        displayText();
        enableSaveButtons();
        saveToLocalStorage();
    };
    reader.readAsText(file);
}

/**
 * Parse plain text file
 * @param {string} content - File content
 */
function parseTextFile(content) {
    // Preserve original formatting - split by lines but keep empty lines and whitespace
    currentText = content.split('\n');
    annotations = {};
}

/**
 * Parse HTML file with embedded annotations
 * @param {string} content - HTML content
 */
function parseHTMLFile(content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const lines = doc.querySelectorAll('.text-line');
    
    currentText = [];
    annotations = {};
    
    lines.forEach((line, index) => {
        const text = line.textContent || line.innerText;
        currentText.push(text);
        
        const annotationAttr = line.getAttribute('data-annotation');
        if (annotationAttr) {
            annotations[index] = annotationAttr;
        }
    });
}

/**
 * Display text content in the container
 */
function displayText() {
    const container = document.getElementById('textContainer');
    
    if (currentText.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No content loaded</h3>
                <p>Upload a text file to start annotating!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = currentText.map((line, index) => {
        const hasAnnotation = annotations.hasOwnProperty(index);
        const annotatedClass = hasAnnotation ? 'annotated' : '';
        
        // Preserve empty lines and whitespace
        const displayLine = line.length === 0 ? '&nbsp;' : escapeHtml(line);
        
        return `
            <div class="text-line ${annotatedClass} fade-in" 
                 data-line-index="${index}"
                 onclick="handleLineClick(${index})"
                 onmouseenter="showTooltip(event, ${index})"
                 onmouseleave="hideTooltip()"
                 style="white-space: pre-wrap; font-family: 'Courier New', monospace;">
                ${displayLine}
            </div>
        `;
    }).join('');
}

/**
 * Handle line click for annotation
 * @param {number} lineIndex - Index of the clicked line
 */
function handleLineClick(lineIndex) {
    if (isRevealMode) return;

    const existingAnnotation = annotations[lineIndex] || '';
    const annotation = prompt(
        `Add annotation for line ${lineIndex + 1}:\n"${currentText[lineIndex]}"`, 
        existingAnnotation
    );
    
    if (annotation !== null) {
        if (annotation.trim() === '') {
            delete annotations[lineIndex];
        } else {
            annotations[lineIndex] = annotation.trim();
        }
        displayText();
        saveToLocalStorage();
    }
}

/**
 * Show tooltip with annotation
 * @param {Event} event - Mouse event
 * @param {number} lineIndex - Line index
 */
function showTooltip(event, lineIndex) {
    if (!isRevealMode || !annotations.hasOwnProperty(lineIndex)) return;

    const tooltip = document.getElementById('tooltip');
    tooltip.textContent = annotations[lineIndex];
    tooltip.style.left = event.pageX + 10 + 'px';
    tooltip.style.top = event.pageY - 10 + 'px';
    tooltip.classList.add('show');
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.remove('show');
}

/**
 * Toggle between edit and reveal modes
 */
function toggleMode() {
    isRevealMode = !isRevealMode;
    const modeButton = document.getElementById('modeButton');
    const modeIndicator = document.getElementById('modeIndicator');
    
    if (isRevealMode) {
        modeButton.textContent = 'Switch to Edit Mode';
        modeIndicator.textContent = 'Reveal Mode';
        modeIndicator.className = 'mode-indicator reveal';
    } else {
        modeButton.textContent = 'Switch to Reveal Mode';
        modeIndicator.textContent = 'Edit Mode';
        modeIndicator.className = 'mode-indicator';
    }
}

/**
 * Save annotated content as HTML file
 */
function saveAnnotatedFile() {
    if (currentText.length === 0) return;

    const htmlContent = generateHTML();
    downloadFile(htmlContent, 'annotated-text.html', 'text/html');
}

/**
 * Save as plain text with annotations in comments
 */
function saveAsText() {
    if (currentText.length === 0) return;

    let textContent = currentText.map((line, index) => {
        let output = line;
        if (annotations.hasOwnProperty(index)) {
            output += ` /* ${annotations[index]} */`;
        }
        return output;
    }).join('\n');

    downloadFile(textContent, 'annotated-text.txt', 'text/plain');
}

/**
 * Generate HTML content with embedded annotations
 * @returns {string} Complete HTML content
 */
function generateHTML() {
    const lines = currentText.map((line, index) => {
        const hasAnnotation = annotations.hasOwnProperty(index);
        const annotationAttr = hasAnnotation ? `data-annotation="${escapeHtml(annotations[index])}"` : '';
        const annotatedClass = hasAnnotation ? 'annotated' : '';
        
        return `        <div class="text-line ${annotatedClass}" ${annotationAttr}>${escapeHtml(line)}</div>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Annotated Text - Inkveil Studio</title>
    <style>
        body { 
            font-family: 'Segoe UI', sans-serif; 
            line-height: 1.6; 
            max-width: 800px; 
            margin: 2rem auto; 
            padding: 0 1rem; 
            background: #f8f9fa;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #dee2e6;
        }
        .text-container {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .text-line { 
            padding: 0.75rem; 
            border-bottom: 1px solid #eee; 
            position: relative;
            transition: background 0.2s ease;
        }
        .text-line:hover {
            background: #f8f9fa;
        }
        .annotated { 
            border-bottom: 2px dotted #3498db; 
            color: #2980b9; 
            cursor: help; 
            font-weight: 500;
        }
        .tooltip { 
            position: absolute; 
            background: #2c3e50; 
            color: white; 
            padding: 0.75rem; 
            border-radius: 6px; 
            font-size: 0.9rem; 
            max-width: 300px; 
            z-index: 1000; 
            opacity: 0; 
            transition: opacity 0.3s;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .annotated:hover .tooltip { 
            opacity: 1; 
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Annotated Text</h1>
        <p><em>Generated by Inkveil Studio</em></p>
    </div>
    <div class="text-container">
${lines}
    </div>
    <script>
        document.querySelectorAll('.annotated').forEach(line => {
            line.addEventListener('mouseenter', (e) => {
                const annotation = e.target.getAttribute('data-annotation');
                if (annotation) {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    tooltip.textContent = annotation;
                    tooltip.style.left = '10px';
                    tooltip.style.top = '100%';
                    e.target.appendChild(tooltip);
                    setTimeout(() => tooltip.style.opacity = '1', 10);
                }
            });
            line.addEventListener('mouseleave', (e) => {
                const tooltip = e.target.querySelector('.tooltip');
                if (tooltip) tooltip.remove();
            });
        });
    </script>
</body>
</html>`;
}

/**
 * Download file with specified content
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Enable save buttons when content is loaded
 */
function enableSaveButtons() {
    document.getElementById('saveButton').disabled = false;
    document.getElementById('saveTextButton').disabled = false;
}

/**
 * Clear all content and annotations
 */
function clearAll() {
    if (confirm('Are you sure you want to clear all content and annotations?')) {
        currentText = [];
        annotations = {};
        document.getElementById('fileInput').value = '';
        document.getElementById('saveButton').disabled = true;
        document.getElementById('saveTextButton').disabled = true;
        displayText();
        clearLocalStorage();
    }
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
    const button = document.querySelector('.mode-toggle');
    button.textContent = isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
    saveToLocalStorage();
}

/**
 * Escape HTML characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Save current state to localStorage (for actual deployment)
 */
function saveToLocalStorage() {
    try {
        const state = {
            currentText,
            annotations,
            isDarkMode
        };
        localStorage.setItem('inkVeilStudio', JSON.stringify(state));
        console.log('Auto-saved to localStorage');
    } catch (e) {
        console.warn('Could not save to localStorage:', e);
    }
}

/**
 * Load state from localStorage (for actual deployment)
 */
function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('inkVeilStudio');
        if (saved) {
            const state = JSON.parse(saved);
            currentText = state.currentText || [];
            annotations = state.annotations || {};
            isDarkMode = state.isDarkMode || false;
            
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
                document.querySelector('.mode-toggle').textContent = '☀️ Light Mode';
            }
            
            if (currentText.length > 0) {
                displayText();
                enableSaveButtons();
            }
        }
    } catch (e) {
        console.warn('Could not load from localStorage:', e);
    }
}

/**
 * Clear localStorage
 */
function clearLocalStorage() {
    try {
        localStorage.removeItem('inkVeilStudio');
        console.log('Cleared localStorage');
    } catch (e) {
        console.warn('Could not clear localStorage:', e);
    }
}
