// Store detected Jupyter environments
const detectedEnvironments = new Map();
let lastCopiedContent = '';

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'JUPYTER_DETECTED':
      // Store the detection result for this tab
      detectedEnvironments.set(sender.tab.id, message.data);
      break;

    case 'CONTENT_COPIED':
      lastCopiedContent = message.content;
      break;

    case 'GET_CONTENT':
      sendResponse({ content: lastCopiedContent });
      return true;  // Important! Keeps the message channel open for async response
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  detectedEnvironments.delete(tabId);
});