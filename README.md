# AIMS Better Experience Chrome Extension

A Manifest V3 extension for the AIMS faculty portal (`aims1.eac.edu.ph`).
It makes data entry faster. It has no backend and no build step.

## Features

| Page                                | Script                                                                    | Function                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| All AIMS pages                      | `src/content/init-config.js`, `src/content/disable-window-open.js`        | Permits right-click and copy. Opens popup windows as tabs.                                   |
| Grading Sheet, period dialog        | `src/content/gradesheet-paste.js`                                         | Pastes a grade column from Excel. Arrow keys and Enter move between students.                |
| Attendance (`modules/studList.php`) | `src/content/studList-accessibility.js`, `src/content/studList-bridge.js` | Pastes attendance values. The popup has the paste direction and the **Sync Changes** button. |

## Development

1. Run `npm install`.
2. Run `npx playwright install chromium` one time.
3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and select the repo folder.
4. After a code change, click the reload icon on the extension card. Then reload the AIMS tab.

`npm run dev` is an alternative to steps 3 and 4. It opens Chrome with the extension and reloads the extension when a file changes.

| Command        | Function                                              |
| -------------- | ----------------------------------------------------- |
| `npm test`     | Runs the offline tests.                               |
| `npm run lint` | Runs ESLint and the Prettier check.                   |
| `npm run dev`  | Opens Chrome with the extension and automatic reload. |
| `./build.sh`   | Makes the zip for distribution.                       |

GitHub Actions runs `npm run lint` and `npm test` on each pull request and on each push to `main` (`.github/workflows/ci.yml`).

### Tests

The tests do not connect to AIMS and cannot write data.
`tests/fixtures/` has copies of AIMS pages with the student data removed.
Each test opens a copy in Chromium, runs a content script on it and records the save requests.

To add a page:

1. Save the HTML of the page into `tests/fixtures/`.
2. Replace the names, the student numbers and the faculty code.
3. Add a test to `tests/paste.test.js`.

### Manifests

There is one manifest. Development and production use the same file, so you test what you ship.

Content scripts that use the jQuery of the page must have `"world": "MAIN"`.
A `MAIN` script cannot use `chrome.*`. `studList-bridge.js` shows how to relay storage and messages with `CustomEvent`.

## Test before you send an update

Do all steps in sequence. Stop if a step fails.

### 1. Automated checks

1. Run `npm run lint`.
2. Run `npm test`.

### 2. Manual test in Chrome

The automated tests use page copies. Only this manual test proves that the real site accepts the saves.

1. Open `chrome://extensions` and click the reload icon on the extension card.
2. Make sure that the card shows no **Errors** button.
3. Log in to AIMS.

Grade paste:

1. Open **Grading Sheet**, select a period and click **Search**.
2. Click a section. Then click the period column header.
3. Make sure that the green hint line of the extension is above the student list.
4. Copy three grades from an Excel column.
5. Click the grade input of the first student and press Ctrl+V.
6. Make sure that the three inputs become green and the hint line shows `Saved 3 of 3 grades.`
7. Close the dialog and open the section again. Make sure that the three grades are there.
8. Paste a column that has a blank row. Make sure that no student is skipped.
9. Paste a column that has the value `101`. Make sure that this input becomes red and stays empty.
10. Set the network to **Offline** in the devtools and paste one grade. Make sure that the input becomes red and a **Retry** button shows. Set the network to online and click the button. Make sure that the input becomes green.
11. Press Arrow Down, Arrow Up and Enter. Make sure that the focus moves between students.

Attendance paste:

1. Open **Class List** and click **Enter Attendance**.
2. Copy two values from Excel, click an input and press Ctrl+V.
3. Make sure that the inputs become yellow.
4. Open the extension popup and click **Sync Changes**.
5. Make sure that the inputs become green.
6. Reload the page. Make sure that the two values are there.

All pages:

1. Right-click on a page. Make sure that the menu opens.
2. Click a link that opens a popup window. Make sure that it opens as a tab.

Use a sheet that is not finalized. Correct the test values after the test.

### 3. Package

1. Increase `version` in `manifest.json`. The Chrome Web Store refuses a version that it already has.
2. Run `./build.sh`.
3. Load the zip content one time with **Load unpacked** to make sure that the package starts.
4. Upload the zip.

## How AIMS works

[`docs/aims-site.md`](docs/aims-site.md) is the reference for the AIMS site: its libraries, pages, endpoints and the site functions that a content script can use.
Update that file when you learn something new about the site.
