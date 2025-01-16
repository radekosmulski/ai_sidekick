// Get content from background script
chrome.runtime.sendMessage({ type: 'GET_CONTENT' }, response => {
  const contentDiv = document.getElementById('content');
  contentDiv.textContent = response.content || 'No content available';

  // Simple drag functionality
  contentDiv.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', contentDiv.textContent);
    e.dataTransfer.effectAllowed = 'copy';
  });

  // Add download button
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download as markdown';
  downloadBtn.onclick = () => {
    const blob = new Blob([contentDiv.textContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'code.md';
    a.click();
    URL.revokeObjectURL(url);
  };
  document.body.insertBefore(downloadBtn, contentDiv);
});