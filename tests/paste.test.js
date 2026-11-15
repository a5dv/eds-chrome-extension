// Offline tests. Each test opens an anonymized copy of an AIMS page,
// runs a content script on it and records the save requests.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
let browser;
before(async () => {
  browser = await chromium.launch();
});
after(() => browser.close());

async function openPage(pagePath, fixture, script, saveUrl) {
  const page = await browser.newPage();
  const saves = [];
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('/js/jquery')) {
      return route.fulfill({ path: require.resolve('jquery/jquery.js') });
    }
    if (url.includes(saveUrl)) {
      saves.push(
        Object.fromEntries(new URLSearchParams(route.request().postData())),
      );
      return route.fulfill({ body: '' });
    }
    return route.fulfill({
      contentType: 'text/html',
      path: path.join(__dirname, 'fixtures', fixture),
    });
  });
  await page.goto(`https://aims.test/eacbed/${pagePath}`);
  await page.addScriptTag({ path: path.join(root, 'src/content', script) });
  return { page, saves };
}

const paste = (page, text) =>
  page.evaluate((text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text', text);
    document.activeElement.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, text);

test('grade paste saves the valid grades of an Excel column', async () => {
  const { page, saves } = await openPage(
    'faculty/faculty.gradesheet.php',
    'gradesheet-entry.html',
    'gradesheet-paste.js',
    'save.grade.scompo.php',
  );
  const inputs = page.locator("input[gtype='mc']");

  // The site loads the dialog inputs with this request.
  await page.evaluate(() => $.post('../gs_2/entry.component.php'));
  await page.getByText('AIMS Better Experience is ready').waitFor();

  await inputs.first().focus();
  await paste(page, 'A\t90\r\nB\t\r\nC\t101\r\nD\tINC\r\n');
  await page.waitForTimeout(500);

  assert.deepStrictEqual(
    saves.map((s) => [s.gid, s.grade]),
    [
      ['1001', '90'],
      ['1003', 'INC'],
    ],
  );
  assert.deepStrictEqual(
    await inputs.evaluateAll((els) =>
      els.slice(0, 4).map((el) => [el.value, el.style.backgroundColor]),
    ),
    [
      ['90', 'rgb(212, 237, 218)'], // saved
      ['', 'rgb(255, 204, 213)'], // above 100: not saved
      ['INC', 'rgb(212, 237, 218)'], // saved. The blank row is ignored.
      ['', ''],
    ],
  );

  await page.keyboard.press('ArrowDown');
  assert.strictEqual(
    await inputs.nth(1).evaluate((el) => el === document.activeElement),
    true,
  );
});

test('attendance paste stages the values and sync saves them', async () => {
  const { page, saves } = await openPage(
    'modules/studList.php?FCode=F000&SY=2627&Sem=A',
    'studList.html',
    'studList-accessibility.js',
    'studListtodb.php',
  );

  await page.locator('input[sno]').first().focus();
  await paste(page, '5\r\n6\r\n');
  assert.deepStrictEqual(saves, []);

  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('aims-attendance-sync')),
  );
  await page.waitForTimeout(500);

  assert.deepStrictEqual(
    saves.map((s) => [s.adv, s.sno, s.mnth, s.atype, s.val]),
    [
      ['F000', '0000C00001', '06', 'Present', '5'],
      ['F000', '0000C00002', '06', 'Present', '6'],
    ],
  );
});
