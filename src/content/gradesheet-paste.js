(function () {
  // The grade inputs of the period dialog (Grading Sheet > section > period).
  const GRADE_INPUT = "input[gtype='mc']";
  // The site accepts these non-numeric grades.
  const LETTER_GRADES = ['INC', 'O', 'VS', 'S', 'FS', 'DE'];

  const isValidGrade = (val) =>
    LETTER_GRADES.includes(val) ||
    (/^\d+(\.\d+)?$/.test(val) && Number(val) <= 100);

  // --- 1. PASTE A COLUMN FROM EXCEL ---
  // Row 1 goes to the focused student. The next rows go to the students below.
  const handlePaste = async (e) => {
    const active = document.activeElement;
    if (!active.matches(GRADE_INPUT)) return;

    e.preventDefault();
    const rows = e.clipboardData
      .getData('text')
      .replace(/\r?\n$/, '')
      .split(/\r?\n/);
    const inputs = Array.from(document.querySelectorAll(GRADE_INPUT));
    const start = inputs.indexOf(active);

    for (let i = 0; i < rows.length; i++) {
      const input = inputs[start + i];
      if (!input) break;

      // If the copy has more than one column, the grade is the last column.
      const val = rows[i].split('\t').pop().trim();
      // An empty cell does not erase a saved grade.
      if (val === '' || input.readOnly) continue;

      if (!isValidGrade(val)) {
        input.style.backgroundColor = '#ffccd5'; // Error Red
        continue;
      }

      input.style.backgroundColor = '#fff3cd'; // Saving Yellow
      // The blur handler of the site saves the grade.
      $(input).val(val).triggerHandler('blur');

      // Throttle: 100ms delay keeps the PHP server stable
      await new Promise((r) => setTimeout(r, 100));
    }
  };

  // --- 2. SAVE RESULT ---
  $(document).ajaxComplete((e, xhr, settings) => {
    if (!settings.url.includes('save.grade.scompo.php')) return;

    const gid = new URLSearchParams(settings.data).get('gid');
    const input = document.querySelector(`${GRADE_INPUT}[gid="${gid}"]`);
    if (input) {
      input.style.backgroundColor = xhr.status === 200 ? '#d4edda' : '#ffccd5';
    }
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
