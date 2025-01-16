const init = async () => {
  try {
    // Inject detector script
    const src = chrome.runtime.getURL('jupyterDetector.js');
    const detector = await import(src);

    const result = await detector.detectJupyter();
    console.log('Jupyter environment:', result);

    // Notify background script of detection result
    chrome.runtime.sendMessage({
      type: 'JUPYTER_DETECTED',
      data: result
    });

    if (result.isJupyter) {
      // Initialize your Jupyter-specific features here
      console.log('Jupyter detected:', result.methods);

      // Add keyboard shortcut listener
      document.addEventListener('keydown', (e) => {
        // Check for Ctrl+Shift+C only (not Cmd)
        if (e.ctrlKey && !e.metaKey && e.shiftKey && e.key === 'C') {
          e.preventDefault(); // Prevent default browser behavior
          console.log('Copy shortcut detected');
          copyAllCells();
        }
      });
    }
  } catch (error) {
    console.error('AI Sidekick initialization failed:', error);
  }
};

async function copyAllCells() {
  try {
    console.log('Copy all cells function called');

    // Find all cells (both code and markdown)
    const cells = document.querySelectorAll('.jp-Cell');

    const content = Array.from(cells).map(cell => {
      // Get all lines from the cell
      const lines = cell.querySelectorAll('.cm-line');

      // Skip empty cells
      if (!lines.length) return '';

      // Extract and join the text content of each line
      const cellContent = Array.from(lines)
        .map(line => {
          // Handle empty lines
          if (line.querySelector('br')) return '';

          // Get all text content in order, preserving spaces
          let lineContent = '';
          line.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              lineContent += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              // Handle spans and preserve spaces between them
              lineContent += node.textContent;
            }
          });

          return lineContent || '';
        })
        .join('\n');

      // Skip empty content
      if (!cellContent.trim()) return '';

      // Add language identifier for code cells
      if (cell.classList.contains('jp-CodeCell')) {
        return '```python\n' + cellContent + '\n```';
      }

      // Return markdown content as-is
      return cellContent;
    }).filter(Boolean).join('\n\n'); // Remove empty cells and join with double newlines

    await navigator.clipboard.writeText(content);
    console.log('Content copied to clipboard');
  } catch (error) {
    console.error('Failed to copy cells:', error);
  }
}

// Run detection after a short delay to ensure Jupyter is fully loaded
setTimeout(() => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}, 1000);
