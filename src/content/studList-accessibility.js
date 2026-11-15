(function () {
  let pasteDirection = 'vertical';
  let isSyncing = false;
  const dirtyInputs = new Set(); // Our "Staging Map"

  // --- 1. CONTEXT SCRAPER ---
  // Grabs the necessary hidden fields for the EAC PHP script
  const getEacContext = () => {
    const params = new URLSearchParams(window.location.search);

    // Mapping URL params to the keys expected by studListtodb.php
    return {
      adv: params.get('FCode'),
      sy: params.get('SY'),
      sem: params.get('Sem'),
    };
  };

  // --- 2. GRID HELPERS ---
  const getSnoList = () => {
    const inputs = document.querySelectorAll('input[sno]');
    return [...new Set(Array.from(inputs).map((i) => i.getAttribute('sno')))];
  };

  const getInput = (sno, monthKey, aType) => {
    return document.querySelector(
      `input[sno="${sno}"][month_key="${monthKey}"][atype="${aType}"]`,
    );
  };

  // --- 3. THE SYNC ENGINE ---
  const emitStatus = (percent, state) => {
    window.dispatchEvent(
      new CustomEvent('aims-attendance-sync-status', {
        detail: { percent, state },
      }),
    );
  };

  const syncBatch = async () => {
    if (isSyncing || dirtyInputs.size === 0) return;

    isSyncing = true;
    const ctx = getEacContext();
    const inputsArray = Array.from(dirtyInputs);

    for (let i = 0; i < inputsArray.length; i++) {
      const input = inputsArray[i];
      const $el = $(input);

      const percent = Math.round(((i + 1) / inputsArray.length) * 100);
      emitStatus(percent, 'syncing');

      const formData = {
        ...ctx,
        val: $el.val(),
        mnth: $el.attr('month_key'),
        sno: $el.attr('sno'),
        name: $el.attr('name'),
        atype: $el.attr('atype'),
      };

      try {
        await $.ajax({
          url: '../process/studListtodb.php',
          type: 'POST',
          data: formData,
        });

        input.style.backgroundColor = '#d4edda'; // Success Green
        dirtyInputs.delete(input);
      } catch {
        input.style.backgroundColor = '#ffccd5'; // Error Red
        console.error(`Failed to sync SNO: ${formData.sno}`);
      }

      // Throttle: 100ms delay keeps the PHP server stable
      await new Promise((r) => setTimeout(r, 100));
    }

    isSyncing = false;
    emitStatus(0, dirtyInputs.size === 0 ? 'done' : 'error');
  };

  // --- 4. NAVIGATION & PASTE ---
  const handleNavigation = (e) => {
    const active = document.activeElement;
    if (active.tagName !== 'INPUT' || !active.hasAttribute('sno')) return;

    const sno = active.getAttribute('sno');
    const monthKey = active.getAttribute('month_key');
    const aType = active.getAttribute('atype');
    const snoList = getSnoList();
    const snoIndex = snoList.indexOf(sno);

    let target;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const nextSno =
        snoList[e.key === 'ArrowUp' ? snoIndex - 1 : snoIndex + 1];
      if (nextSno) target = getInput(nextSno, monthKey, aType);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const rowInputs = Array.from(
        active.closest('tr').querySelectorAll('input[sno]'),
      );
      const currentIndex = rowInputs.indexOf(active);
      target =
        rowInputs[e.key === 'ArrowLeft' ? currentIndex - 1 : currentIndex + 1];
    }

    if (target) {
      e.preventDefault();
      target.focus();
      target.select();
    }
  };

  const handlePaste = (e) => {
    const active = document.activeElement;
    if (active.tagName !== 'INPUT' || !active.hasAttribute('sno')) return;

    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const values = text.split(/[\t\n\r]+/).filter((v) => v.trim() !== '');

    const snoList = getSnoList();
    const currentSnoIndex = snoList.indexOf(active.getAttribute('sno'));
    const monthKey = active.getAttribute('month_key');
    const aType = active.getAttribute('atype');
    const rowInputs = Array.from(
      active.closest('tr').querySelectorAll('input[sno]'),
    );
    const currentRowInputIndex = rowInputs.indexOf(active);

    values.forEach((val, i) => {
      let target;
      if (pasteDirection === 'horizontal') {
        target = rowInputs[currentRowInputIndex + i];
      } else {
        const targetSno = snoList[currentSnoIndex + i];
        if (targetSno) target = getInput(targetSno, monthKey, aType);
      }

      if (target) {
        const valTrimmed = val.trim();
        const max = Number(target.getAttribute('maxmonth'));

        // Staging Logic
        if (Number(valTrimmed) > max) {
          target.value = '';
          target.style.backgroundColor = '#ffccd5'; // Error
        } else {
          target.value = valTrimmed;
          target.style.backgroundColor = '#fff3cd'; // Staged Yellow
          dirtyInputs.add(target); // Add to map
        }
      }
    });
  };

  // --- 5. SETTINGS LISTENER ---
  window.addEventListener('aims-settings', (e) => {
    if (e.detail.pasteDirection) pasteDirection = e.detail.pasteDirection;
  });

  // --- 6. SYNC COMMAND LISTENER ---
  window.addEventListener('aims-attendance-sync', () => syncBatch());

  // --- 7. INITIALIZATION ---
  // Neutralize the site's original blur listener so we don't save twice
  // This needs to happen in the MAIN world where jQuery is available
  if (window.jQuery) {
    $('input').off('blur');
    console.log('✅ AIMS Better Experience: Site auto-save disabled.');
  }

  document.addEventListener('keydown', handleNavigation);
  document.addEventListener('paste', handlePaste);
})();
