// assets/js/access-check.js
(function () {
  const childInput = document.getElementById('child_name');
  const parentInput = document.getElementById('parent_name');
  const checkBtn    = document.getElementById('accessCheckBtn');
  const statusEl    = document.getElementById('accessStatus');

  const attYes   = document.getElementById('attYes');
  const attNo    = document.getElementById('attNo');
  const rsvpYes  = document.getElementById('rsvpYes');
  const rsvpNo   = document.getElementById('rsvpNo');

  if (!childInput || !parentInput || !checkBtn || !statusEl || !attYes || !attNo) return;

  // Find the fieldset that contains the attending Yes/No radios so we can hide/show it
  const attFieldset = attYes.closest('fieldset');
  // Optionally hide the whole row/column for cleaner spacing
  const attBlock = attFieldset?.closest('.col-12') || attFieldset;

  // Start with radios disabled and the whole attending section hidden
  function setAttendingEnabled(enabled) {
    attYes.disabled = !enabled;
    attNo.disabled  = !enabled;
  }
  function setAttendingVisible(visible) {
    if (!attBlock) return;
    attBlock.classList.toggle('d-none', !visible);
  }
  setAttendingEnabled(false);
  setAttendingVisible(false);

  // Normalise names: UPPERCASE + remove spaces & hyphens
  function normaliseName(s) {
    return (s || '')
      .toUpperCase()
      .replace(/[\s\-]+/g, '')
      .trim();
  }

  // Enable button only when both fields have something; keep status hidden while typing
  function toggleButton() {
    const hasChild  = childInput.value.trim().length > 0;
    const hasParent = parentInput.value.trim().length > 0;
    checkBtn.disabled = !(hasChild && hasParent);

    statusEl.classList.add('d-none');
    statusEl.innerHTML = '';
  }
  childInput.addEventListener('input', toggleButton);
  parentInput.addEventListener('input', toggleButton);
  toggleButton(); // initial state

  // Use names.json relative to <base href="/Shadow-Force/">
  const LIST_URL = new URL('assets/data/names.json', document.baseURI);

  async function resolveIsAllowed(nameKey) {
    // If you expose a global validator, prefer that
    if (typeof window.validateAccessByName === 'function') {
      try {
        const maybe = window.validateAccessByName(nameKey);
        return typeof maybe?.then === 'function' ? await maybe : !!maybe;
      } catch (_) { /* fall through */ }
    }

    // Fallback: fetch names.json (supports array or { allowed: [...] })
    try {
      const res  = await fetch(LIST_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('names.json fetch failed');
      const json = await res.json();
      const arr  = Array.isArray(json) ? json : (Array.isArray(json?.allowed) ? json.allowed : []);
      const set  = new Set(arr.map(normaliseName));
      return set.has(normaliseName(nameKey));
    } catch (e) {
      console.warn('Access check failed:', e);
      return false; // fail closed on error
    }
  }

  function showGranted(childDisplayName) {
    statusEl.classList.remove('d-none', 'alert-danger');
    statusEl.classList.add('alert', 'alert-success');
    statusEl.innerHTML = `🟢 <strong>Access Granted.</strong> Welcome, agent <strong>${childDisplayName}</strong>.`;

    // Reveal and enable Attending radios
    setAttendingVisible(true);
    setAttendingEnabled(true);

    // Optional UX: move focus to "Yes"
    attYes.focus();
  }

  function showDenied(childDisplayName) {
    statusEl.classList.remove('d-none', 'alert-success');
    statusEl.classList.add('alert', 'alert-danger');
    statusEl.innerHTML = `🔴 <strong>Access Denied.</strong> We can’t find <strong>${childDisplayName}</strong> on the list.
      <br><a class="link-light fw-semibold" href="#contact">Contact us</a> if you think this is an error.`;

    // Hide + disable Attending radios
    setAttendingEnabled(false);
    setAttendingVisible(false);

    // Also collapse any open YES/NO sections (Bootstrap)
    if (rsvpYes?.classList.contains('show')) new bootstrap.Collapse(rsvpYes, { toggle: true });
    if (rsvpNo ?.classList.contains('show')) new bootstrap.Collapse(rsvpNo,  { toggle: true });
  }

  checkBtn.addEventListener('click', async () => {
    const childDisplay = childInput.value.trim();      // Show this back to user
    const childKey     = normaliseName(childDisplay);  // Lookup key
    const parent       = parentInput.value.trim();

    if (!childKey || !parent) return; // button state should already guard this

    // Spinner state
    const originalHtml = checkBtn.innerHTML;
    checkBtn.disabled  = true;
    checkBtn.innerHTML = 'Checking…';

    const allowed = await resolveIsAllowed(childKey);

    // Restore button
    checkBtn.disabled  = false;
    checkBtn.innerHTML = originalHtml;

    // Show outcome
    if (allowed) showGranted(childDisplay);
    else showDenied(childDisplay);
  });

  // If user edits either field after checking, hide the status and (optionally) hide attending again
  [childInput, parentInput].forEach(el =>
    el.addEventListener('input', () => {
      statusEl.classList.add('d-none');
      statusEl.innerHTML = '';
      setAttendingVisible(false);
      setAttendingEnabled(false);
    })
  );
})();
