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

      // Track key state
      let isCtrlShiftPressed = false;
      let lastKeyPressTime = 0;
      const KEY_TIMEOUT = 1000; // Reset after 1 second

      // Add keyboard shortcut listener
      document.addEventListener('keydown', (e) => {
        const currentTime = Date.now();

        // Check for Ctrl+Shift being pressed
        if (e.ctrlKey && !e.metaKey && e.shiftKey) {
          if (e.key === 'C') {
            e.preventDefault(); // Prevent default browser behavior

            if (!isCtrlShiftPressed) {
              // First Ctrl+Shift+C press
              console.log('First C press detected');
              isCtrlShiftPressed = true;
              lastKeyPressTime = currentTime;
              copyAllCells();
            } else if (currentTime - lastKeyPressTime < KEY_TIMEOUT) {
              // Subsequent C press within timeout
              console.log('Second C press detected');
              // TODO: Add your additional functionality here
              handleSecondCPress();
            }
          }
        }
      });

      // Reset state when Ctrl or Shift is released
      document.addEventListener('keyup', (e) => {
        if (e.key === 'Control' || e.key === 'Shift') {
          isCtrlShiftPressed = false;
        }
      });

      // Reset state after timeout
      setInterval(() => {
        if (Date.now() - lastKeyPressTime > KEY_TIMEOUT) {
          isCtrlShiftPressed = false;
        }
      }, KEY_TIMEOUT);
    }
  } catch (error) {
    console.error('AI Sidekick initialization failed:', error);
  }
};

async function handleSecondCPress() {
  try {
    console.log('Opening Claude in new tab');
    window.open('https://claude.ai/new', '_blank');

    // Get the content from clipboard and send to background
    const content = await navigator.clipboard.readText();
    chrome.runtime.sendMessage({
      type: 'CONTENT_COPIED',
      content: content
    });

  } catch (error) {
    console.error('Failed to handle second C press:', error);
  }
}

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
