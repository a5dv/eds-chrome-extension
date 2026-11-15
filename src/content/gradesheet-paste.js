(function () {
  // The grade inputs of the period dialog (Grading Sheet > section > period).
  const GRADE_INPUT = "input[gtype='mc']";
  // The site accepts these non-numeric grades.
  const LETTER_GRADES = ['INC', 'O', 'VS', 'S', 'FS', 'DE'];

  const isValidGrade = (val) =>
    LETTER_GRADES.includes(val) ||
    (/^\d+(\.\d+)?$/.test(val) && Number(val) <= 100);

  // --- 1. PASTE A COLUMN FROM EXCEL ---
  // Value 1 goes to the focused student. The next values go to the students below.
  // Blank rows are ignored. In Excel they are divider rows (MALE / FEMALE).
  // The saves go one at a time. A slow connection makes the paste slower,
  // but the requests do not pile up.
  let saving; // The input of the current save request and its resolve function.
  const failed = new Set(); // Inputs with a failed save request.

  const save = (input) => {
    input.style.backgroundColor = '#fff3cd'; // Saving Yellow
    const result = new Promise((resolve) => (saving = { input, resolve }));
    // The blur handler of the site saves the grade.
    $(input).triggerHandler('blur');
    return result;
  };

  const showResult = (text) => {
    const $hint = $('#aims-hint').text(text);
    if (failed.size === 0) return;
    $('<button type="button" style="margin-left:8px">')
      .text(`Retry ${failed.size} failed`)
      .click(retryFailed) // The page has jQuery 1.6, which has no .on()
      .appendTo($hint);
  };

  const retryFailed = async () => {
    const inputs = [...failed];
    let saved = 0;
    $('#aims-hint').text('Retry in progress...');
    for (const input of inputs) {
      if (await save(input)) saved++;
    }
    showResult(`Saved ${saved} of ${inputs.length} failed grades.`);
  };

  const handlePaste = async (e) => {
    const active = document.activeElement;
    if (!active.matches(GRADE_INPUT)) return;

    e.preventDefault();
    // If the copy has more than one column, the grade is the last column.
    const values = e.clipboardData
      .getData('text')
      .split(/\r?\n/)
      .map((row) => row.split('\t').pop().trim())
      .filter((val) => val !== '');
    const inputs = Array.from(document.querySelectorAll(GRADE_INPUT));
    const start = inputs.indexOf(active);
    let saved = 0;

    for (let i = 0; i < values.length; i++) {
      const input = inputs[start + i];
      if (!input) break;
      if (input.readOnly) continue;

      const val = values[i];

      if (!isValidGrade(val)) {
        input.style.backgroundColor = '#ffccd5'; // Error Red
        continue;
      }

      $(input).val(val);
      if (await save(input)) saved++;
    }

    showResult(
      `Saved ${saved} of ${values.length} grades.` +
        (saved < values.length ? ' Red grades are not saved.' : ''),
    );
  };

  // --- 2. READY HINT AND SAVE RESULT ---
  $(document).ajaxComplete((e, xhr, settings) => {
    // The period dialog loaded its inputs.
    if (settings.url.includes('entry.component.php')) {
      failed.clear();
      $(GRADE_INPUT)
        .not('[readonly]')
        .first()
        .closest('table')
        .before(
          '<p id="aims-hint" style="background:#d4edda;padding:6px;margin:0 0 6px">' +
            '✅ AIMS Better Experience is ready. Click the first grade and ' +
            'press Ctrl+V to paste a column from Excel.</p>',
        );
      return;
    }
    if (!settings.url.includes('save.grade.scompo.php')) return;

    const ok = xhr.status === 200;
    const gid = new URLSearchParams(settings.data).get('gid');
    const input = document.querySelector(`${GRADE_INPUT}[gid="${gid}"]`);
    if (input) {
      input.style.backgroundColor = ok ? '#d4edda' : '#ffccd5';
      if (ok) failed.delete(input);
      else failed.add(input);
    }
    // A save from the keyboard can complete at the same time. Ignore it here.
    if (saving && saving.input === input) saving.resolve(ok);
  });

  // --- 3. NAVIGATION ---
  const handleNavigation = (e) => {
    const active = document.activeElement;
    if (!active.matches(GRADE_INPUT)) return;
    if (!['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;

    const inputs = Array.from(document.querySelectorAll(GRADE_INPUT));
    const index = inputs.indexOf(active);
    const target = inputs[e.key === 'ArrowUp' ? index - 1 : index + 1];

    if (target) {
      e.preventDefault();
      target.focus();
      target.select();
    }
  };

  document.addEventListener('paste', handlePaste);
  document.addEventListener('keydown', handleNavigation);
})();
