(function () {
  // 1. Neutralize the library object immediately
  const mock = {
    isSuspend: true,
    isRunning: true,
    isDevToolOpened: () => false,
    md5: () => '',
  };

  try {
    Object.defineProperty(window, 'DisableDevtool', {
      value: mock,
      writable: false,
      configurable: false,
    });
  } catch {
    // The property is already defined.
  }

  // 2. Kill the "Right-Click Disabled" annoyance
  // These portals love using oncontextmenu = () => false
  window.addEventListener('contextmenu', (e) => e.stopPropagation(), true);

  // 3. Re-enable Copy, Cut, and Paste
  // Often disabled in these 'security' scripts
  const allowEvent = (e) => e.stopPropagation();
  window.addEventListener('copy', allowEvent, true);
  window.addEventListener('cut', allowEvent, true);
  // window.addEventListener('paste', allowEvent, true);

  // 4. Trap the "Logout Redirect"
  // If a hidden script tries to kick you out, the browser will ask for confirmation
  // window.onbeforeunload = function () {
  //   console.warn('🛡️ Extension: Blocked a logout/redirect attempt.');
  //   return 'Automation is running. Stay on this page?';
  // };

  console.log('✅ AIMS Better Experience: Runtime protections active.');
})();
