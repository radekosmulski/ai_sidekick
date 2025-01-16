// Store detected Jupyter environments
const detectedEnvironments = new Map();
let lastCopiedContent = '';

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'JUPYTER_DETECTED':
      // Store the detection result for this tab
      detectedEnvironments.set(sender.tab.id, message.data);
      // Maybe notify other parts of the extension
      chrome.runtime.sendMessage({
        type: 'JUPYTER_STATUS_CHANGED',
        tabId: sender.tab.id,
        data: message.data
      });
      break;

    case 'GET_JUPYTER_STATUS':
      // Return cached status for a tab
      sendResponse(detectedEnvironments.get(sender.tab.id));
      break;

    case 'CONTENT_COPIED':
      lastCopiedContent = message.content;
      break;

    case 'GET_CONTENT':
      sendResponse({ content: lastCopiedContent });
      break;
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  detectedEnvironments.delete(tabId);
});