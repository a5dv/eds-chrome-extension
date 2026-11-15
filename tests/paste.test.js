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
  let active = 0; // save requests in progress
  let failNext77 = true;
  await page.route('**/*', (route) => {
    const url = route.request().url();
    // The Grading Sheet page has jQuery 1.6.1. The attendance page has 1.9.1.
    if (url.endsWith('/js/jquery.js')) {
      return route.fulfill({
        path: path.join(__dirname, 'fixtures/jquery-1.6.1.js'),
      });
    }
    if (url.endsWith('/js/jquery-1.9.1.js')) {
      return route.fulfill({ path: require.resolve('jquery/jquery.js') });
    }
    if (url.includes(saveUrl)) {
      const data = new URLSearchParams(route.request().postData());
      saves.push({ ...Object.fromEntries(data), active: ++active });
      // A slow server. The first save of the grade 77 fails.
      const fail = failNext77 && data.get('grade') === '77';
      if (fail) failNext77 = false;
      return setTimeout(() => {
        active--;
        route.fulfill({ status: fail ? 500 : 200 });
      }, 200);
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
  await paste(page, 'A\t90\r\nB\t\r\nC\t101\r\nD\tINC\r\nE\t77\r\n');
  await page
    .getByText('Saved 2 of 4 grades. Red grades are not saved.')
    .waitFor();

  assert.deepStrictEqual(
    // active = 1: each save starts after the save before it is complete.
    saves.map((s) => [s.gid, s.grade, s.active]),
    [
      ['1001', '90', 1],
      ['1003', 'INC', 1],
      ['1004', '77', 1],
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
      ['77', 'rgb(255, 204, 213)'], // server error: not saved
    ],
  );

  await page.getByRole('button', { name: 'Retry 1 failed' }).click();
  await page.getByText('Saved 1 of 1 failed grades.').waitFor();
  assert.deepStrictEqual(
    await inputs.nth(3).evaluate((el) => [el.value, el.style.backgroundColor]),
    ['77', 'rgb(212, 237, 218)'],
  );
  assert.strictEqual(await page.getByRole('button').count(), 0);

  await inputs.first().focus();
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
