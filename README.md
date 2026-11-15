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
3. Copy three grades from an Excel column.
4. Click the grade input of the first student and press Ctrl+V.
5. Make sure that the three inputs become green.
6. Close the dialog and open the section again. Make sure that the three grades are there.
7. Paste a column that has the value `101`. Make sure that this input becomes red and stays empty.
8. Press Arrow Down, Arrow Up and Enter. Make sure that the focus moves between students.

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

All paths are below `https://aims1.eac.edu.ph/eacbed/`. The pages use jQuery and PHP endpoints that return HTML.

### Login

- Page: `faculty/`
- Request: `POST process/new.validate.php` with `usertype`, `username`, `password` and `_token`.
- The page encrypts `usertype`, `username` and `password` with GibberishAES (AES-256-CBC, OpenSSL format). The key is in the inline script of the page.
- The session is a `PHPSESSID` cookie.

### Grading Sheet (`faculty/faculty.gradesheet.php`)

The page loads each step into `#content` with a `POST` request.

| Step                         | Site function                 | Endpoint                           |
| ---------------------------- | ----------------------------- | ---------------------------------- |
| Search                       | `loadgradingsheet_config()`   | `gs_2/gradingsheet.config.fac.php` |
| Click a section              | `displaygradingsheet(...)`    | `gs_2/gradingsheet.display.php`    |
| Click a period column header | `doviewcomponents(periodId)`  | `gs_2/componententry.list.php`     |
| The dialog loads its inputs  | `displaycomponentdetails("")` | `gs_2/entry.component.php`         |

- The dialog has one `input[gtype='mc']` for each student. The `gid` attribute identifies the grade record.
- The students are in the sequence MALE, then FEMALE.
- The `blur` handler of the input saves the grade: `POST gs_2/save.grade.scompo.php` with `job=main`, `pid`, `gid`, `cid`, `grade`, `deptType`.
- The handler accepts numbers from 0 to 100 and the values `INC`, `O`, `VS`, `S`, `FS`, `DE`.
- A value above 100 makes the handler show an alert and save an empty grade.
- An empty input saves an empty grade when it loses focus.
- Inputs are `readonly` after the teacher finalizes the sheet.

### Attendance (`modules/studList.php?FCode=&SY=&Sem=`)

- Open it from Class List with the **Enter Attendance** button.
- Each student has one `Present` input and one `Tardy` input for each month.
- Input attributes: `sno`, `month_key`, `atype`, `maxmonth`, `name`.
- The `blur` handler of the input saves the value: `POST process/studListtodb.php` with `adv`, `sy`, `sem`, `val`, `mnth`, `sno`, `name`, `atype`.
- The extension removes this handler and saves the staged inputs when the user clicks **Sync Changes**.

### Devtools block

Each page loads `js/disable-devtool/disable-devtool.min.js`. That script closes the page when the Chrome devtools are open.

- `src/rules.json` blocks the script with `declarativeNetRequest`. This lets you inspect the HTML of the pages.
- `init-config.js` defines a mock `window.DisableDevtool` for page code that uses it.
