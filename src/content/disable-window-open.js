(function () {
  // Save the original function
  const originalWindowOpen = window.open;

  // Overwrite it
  window.open = function (url, name, specs) {
    console.log(`🔗 Intercepted window.open for: ${name}`);

    // If the site provides 'specs' (the 3rd argument), it triggers a popup.
    // We force it to '_blank' and remove the specs to force a new tab.
    if (specs) {
      return originalWindowOpen(url, '_blank');
    }

    // Otherwise, let it behave normally
    return originalWindowOpen(url, name, specs);
  };

  console.log('✅ AIMS Better Experience: Popup-to-Tab redirector active.');
})();
