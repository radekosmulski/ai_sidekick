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

    // Send the last copied content from background script
    chrome.runtime.sendMessage({
      type: 'CONTENT_COPIED',
      content: lastCopiedContent  // We'll store this when copying
    });

  } catch (error) {
    console.error('Failed to handle second C press:', error);
  }
}

async function copyAllCells() {
  try {
    console.log('Copy all cells function called');

    // Try both modern and classic notebook cell selectors
    const modernCells = document.querySelectorAll('.jp-Cell');
    const classicCells = document.querySelectorAll('.cell');

    // Use whichever format is present
    const cells = modernCells.length ? modernCells : classicCells;

    const content = Array.from(cells).map(cell => {
      // For modern Jupyter
      const modernLines = cell.querySelectorAll('.cm-line');

      // For classic Jupyter
      const classicMarkdown = cell.querySelector('.text_cell_render');
      const classicCode = cell.querySelector('.CodeMirror');

      // Handle modern Jupyter format
      if (modernLines.length) {
        const cellContent = Array.from(modernLines)
          .map(line => {
            if (line.querySelector('br')) return '';

            let lineContent = '';
            line.childNodes.forEach(node => {
              if (node.nodeType === Node.TEXT_NODE) {
                lineContent += node.textContent;
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                lineContent += node.textContent;
              }
            });
            return lineContent || '';
          })
          .join('\n');

        if (!cellContent.trim()) return '';

        // Add language identifier for code cells
        if (cell.classList.contains('jp-CodeCell')) {
          return '```python\n' + cellContent + '\n```';
        }
        return cellContent;
      }

      // Handle classic Jupyter format
      else if (classicMarkdown || classicCode) {
        // Handle markdown cells
        if (classicMarkdown) {
          let content = '';
          const children = Array.from(classicMarkdown.children);

          for (const child of children) {
            if (child.tagName === 'PRE') {
              // Handle code blocks
              const code = child.querySelector('code');
              if (code) {
                content += '```\n' + code.textContent + '\n```\n\n';
              }
            } else {
              // Handle regular text and inline code
              content += child.textContent + '\n\n';
            }
          }

          return content.trim();
        }
        // Handle code cells
        else if (classicCode) {
          const code = classicCode.querySelector('.CodeMirror-code');
          if (code) {
            const codeContent = code.innerText
              .replace(/^\d+(\s|$)/gm, '') // Remove line numbers if present
              .trim();
            return '```python\n' + codeContent + '\n```';
          }
        }
      }

      return '';
    }).filter(Boolean).join('\n\n');

    // Store content before copying
    lastCopiedContent = content;

    // Try the modern clipboard API first
    try {
      await navigator.clipboard.writeText(content);
    } catch (clipboardError) {
      // Fallback to execCommand
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        const successful = document.execCommand('copy');
        if (!successful) throw new Error('execCommand copy failed');
      } catch (execError) {
        console.error('execCommand error:', execError);
        throw execError;
      } finally {
        document.body.removeChild(textarea);
      }
    }

    // Send content to background script
    chrome.runtime.sendMessage({
      type: 'CONTENT_COPIED',
      content: content
    });

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

// Add this at the top with other variables
let lastCopiedContent = '';
