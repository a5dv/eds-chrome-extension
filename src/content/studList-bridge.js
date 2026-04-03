// Bridge: ISOLATED world ↔ MAIN world
// Relays chrome.storage/messages to the page via CustomEvent, and vice versa

// --- Settings: storage → MAIN world ---
const sendSettings = async () => {
  const { pasteDirection } = await chrome.storage.local.get('pasteDirection');
  window.dispatchEvent(
    new CustomEvent('aims-settings', {
      detail: { pasteDirection: pasteDirection || 'vertical' },
    }),
  );
};

sendSettings();

chrome.storage.onChanged.addListener((changes) => {
  if (changes.pasteDirection) {
    window.dispatchEvent(
      new CustomEvent('aims-settings', {
        detail: { pasteDirection: changes.pasteDirection.newValue },
      }),
    );
  }
});

// --- Sync command: popup → MAIN world ---
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'attendance-sync') {
    window.dispatchEvent(new CustomEvent('aims-attendance-sync'));
  }
});

// --- Sync status: MAIN world → popup ---
window.addEventListener('aims-attendance-sync-status', (e) => {
  chrome.runtime.sendMessage({
    action: 'attendance-sync-status',
    percent: e.detail.percent,
    state: e.detail.state,
  });
});
