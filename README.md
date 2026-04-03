# AIMS Better Experience Chrome Extension

A simple Chrome extension built with Manifest V3.

## Project Structure

```
├── manifest.json              # Extension manifest (MV3)
├── assets/icons/              # Extension icons (16, 48, 128px)
├── src/
│   ├── background/
│   │   └── service-worker.js  # Background service worker
│   ├── content/
│   │   ├── content.js         # Content script (injected into pages)
│   │   └── content.css        # Content script styles
│   ├── popup/
│   │   ├── popup.html         # Popup UI
│   │   ├── popup.css          # Popup styles
│   │   └── popup.js           # Popup logic
│   └── utils/
│       └── storage.js         # Chrome storage helpers
```

## Development

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the project root directory.
4. Add your icon PNGs (16×16, 48×48, 128×128) to `assets/icons/`.
