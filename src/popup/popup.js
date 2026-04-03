document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';

  const isStudList = url.includes(
    'aims1.eac.edu.ph/eacbed/modules/studList.php',
  );

  if (isStudList) {
    document.getElementById('studlist-settings').hidden = false;
    document.getElementById('no-settings').hidden = true;

    // Load saved setting
    const { pasteDirection } = await chrome.storage.local.get('pasteDirection');
    const select = document.getElementById('paste-direction');
    if (pasteDirection) select.value = pasteDirection;

    select.addEventListener('change', (e) => {
      chrome.storage.local.set({ pasteDirection: e.target.value });
    });

    // Sync button
    const syncBtn = document.getElementById('attendance-sync-btn');
    const progressFill = document.getElementById('studlist-sync-progresss');

    syncBtn.addEventListener('click', () => {
      chrome.tabs.sendMessage(tab.id, { action: 'attendance-sync' });
      syncBtn.disabled = true;
      syncBtn.textContent = '⌛ Syncing...';
    });

    // Listen for progress updates from the bridge
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action !== 'attendance-sync-status') return;

      progressFill.style.width = `${msg.percent}%`;

      if (msg.state === 'done') {
        syncBtn.disabled = false;
        syncBtn.textContent = '💾 Sync Changes';
        progressFill.style.width = '0%';
      } else if (msg.state === 'error') {
        syncBtn.disabled = false;
        syncBtn.textContent = '💾 Sync Changes';
      }
    });
  }
});
