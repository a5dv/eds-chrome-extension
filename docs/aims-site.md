# AIMS site reference

This file records how the AIMS faculty portal works, as seen from the browser.
The extension has no access to the server code. All facts come from the HTML and the scripts that the site sends.

- Base path: `https://aims1.eac.edu.ph/eacbed/`. All paths in this file are below it.
- Last check of the facts: 2026-11-15.
- The vendor can change the site at any time. When a fact is wrong, correct it here in the same pull request as the code fix.

## How to add to this file

1. Open the page in Chrome with the extension loaded. The extension blocks the devtools script, so the devtools stay open.
2. Use the **Network** panel to find the request that a click or a `blur` sends.
3. Use the **Sources** panel to read the handler in the inline script of the page.
4. Write the page, the selector, the endpoint and the request fields here.
5. Save an anonymized copy of the HTML in `tests/fixtures/` and add a test.

## Technology

| Part                    | Technology                                                               | Effect on the extension                                                                      |
| ----------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Server                  | PHP. Each endpoint returns an HTML fragment, XML or JSON.                | There is no JSON API. Read the DOM.                                                          |
| Page updates            | The site puts HTML fragments into `#content` or into a jQuery UI dialog. | Elements appear after page load. Use listeners on `document`, or `$(document).ajaxComplete`. |
| Session                 | `PHPSESSID` cookie.                                                      | A content script uses the session of the teacher. No login code is necessary.                |
| jQuery on Grading Sheet | 1.6.1 (`js/jquery.js`)                                                   | No `.on()` and no `.off()`. Use `.click()`, `.blur()`, `.bind()` and `.unbind()`.            |
| jQuery on Attendance    | 1.9.1 (`js/jquery-1.9.1.js`)                                             | `.on()` and `.off()` are available.                                                          |
| jQuery on Login         | 1.9.1                                                                    |                                                                                              |
| jQuery UI               | 1.10.2 (`js/jquery-ui.js`), loaded with the grading sheet fragment       | The period dialog is `$('#pop').dialog(...)`.                                                |
| Notifications           | noty (`includes/noty/`), NProgress                                       | Seen on the login page.                                                                      |
| Login encryption        | GibberishAES (`js/hash.js`), SHA-512 (`js/sha512.js`)                    | See **Login**.                                                                               |
| Devtools block          | disable-devtool (`js/disable-devtool/disable-devtool.min.js`)            | `src/rules.json` blocks it.                                                                  |
| Layout                  | HTML tables with inline styles. Few `id` and `class` attributes.         | Select elements by their custom attributes, for example `gtype`, `gid`, `sno`.               |

Check the jQuery version of a page before you write code for it: run `$.fn.jquery` in the console.

### Rules for a content script

- A script that uses `$` or a site function must have `"world": "MAIN"` in `manifest.json`.
- A `MAIN` script cannot use `chrome.*`. `src/content/studList-bridge.js` shows how to relay storage and messages with `CustomEvent`.
- Use the save handler of the site (`$(input).triggerHandler('blur')`) and do not build the save request yourself. The handler has the correct fields for each page.
- `.trigger('blur')` also moves the focus out of the input. `.triggerHandler('blur')` does not.
- The save handlers do not report a failure. Use `$(document).ajaxComplete` and the HTTP status to find one.
- The site sends one request for each input. Wait for the answer before you send the next request.

## Site functions

These functions are global on the Grading Sheet page. A `MAIN` content script can call them.

Some functions have two definitions. The page loads `gs_2/gs_extra.fac.js` last, so its definition is the active one.

| Function                                                           | Source                                | Function                                                                             |
| ------------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------ |
| `loadgradingsheet_config()`                                        | `gs_2/gs_extra.fac.js`                | Reads the search form and loads the section list into `#content`.                    |
| `displaygradingsheet(sy, sem, deptype, sectcode, subjcode, fcode)` | `gs_2/gs_extra.fac.js`                | Loads the grading sheet of one section into `#content`.                              |
| `doviewcomponents(periodId)`                                       | `gs_2/gs_extra.fac.js`                | Opens the period dialog. `periodId` is in the `onclick` of the period column header. |
| `displaycomponentdetails(componentId)`                             | Inline, in the dialog fragment        | Loads the grade inputs into `#compodisplay`.                                         |
| `recom_component(gid)`                                             | Inline, in the entry fragment         | Computes the grade of one row again from its sub-components.                         |
| `dochangegradevalue(xml)`                                          | Inline, in the grading sheet fragment | Puts the saved grade into the sheet below the dialog. The save handler calls it.     |
| `finalizegrades(educ)`                                             | Inline, in the page                   | Opens the review of the sheet before the teacher finalizes it.                       |
| `computeequivalent(grade)`                                         | Inline, in the page                   | Returns the equivalent of a grade from `array_equivalent`.                           |
| `replacespecialcharacters(str, 'encode')`                          | `gradingsheet/gradesheet.js`          | Encodes a value for a request field.                                                 |
| `centerThis(divId)`, `doclose(divId)`                              | `gradingsheet/gradesheet.js`          | Centers and closes the old shade dialogs.                                            |
| `newRequestObj()`, `XMLhttpsender(xhr, url, method, params)`       | `js/ajax.js`                          | The old request helpers of the site, without jQuery.                                 |

Global variables on the Grading Sheet page: `sy_global`, `sem_global`, `sectcode_global`, `subjectcode_global`, `fcode_global`, `depttype_global`, `Period_global`, `moduleid`.
They have the values of the last search or the last section that the teacher opened.

Functions on the Attendance page:

| Function                    | Function                                                        |
| --------------------------- | --------------------------------------------------------------- |
| `numbersonly(field, event)` | The `onKeyPress` handler of each input. It permits digits only. |

## Pages

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

- The page has jQuery 1.6.1. It has no `.on()`. Use `.click()`, `.blur()` and `.bind()`.
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
