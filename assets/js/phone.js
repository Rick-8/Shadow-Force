(function () {
  const form = document.getElementById('rsvpForm');
  const phoneInput = document.getElementById('phone');
  if (!phoneInput || !form) return;

  const ukMobile = /^(\+44\s?7\d{9}|07\d{9})$/;

  // Normalise characters as the user types (keep digits and one leading +)
  phoneInput.addEventListener('input', () => {
    let v = phoneInput.value.replace(/[()\-\s]/g, '');
    // allow a single + only at the start
    v = v.replace(/\+/g, (m, i) => (i === 0 ? '+' : ''));
    phoneInput.value = v;

    // live validity toggle
    if (v && !ukMobile.test(v)) {
      phoneInput.setCustomValidity('Please enter a UK mobile (07XXXXXXXXX or +447XXXXXXXXX).');
      phoneInput.classList.add('is-invalid');
    } else {
      phoneInput.setCustomValidity('');
      phoneInput.classList.remove('is-invalid');
    }
  });

  phoneInput.addEventListener('blur', () => {
    const v = phoneInput.value.trim();
    if (v && !ukMobile.test(v)) {
      phoneInput.setCustomValidity('Please enter a UK mobile (07XXXXXXXXX or +447XXXXXXXXX).');
      phoneInput.classList.add('is-invalid');
    } else {
      phoneInput.setCustomValidity('');
      phoneInput.classList.remove('is-invalid');
    }
  });

  form.addEventListener('submit', (e) => {
    // Only enforce when attending = yes (mirrors data-required-when="yes")
    const attYes = document.getElementById('attYes');
    const goingYes = attYes && !attYes.disabled && attYes.checked;

    const v = phoneInput.value.trim();
    if (goingYes && !ukMobile.test(v)) {
      e.preventDefault();
      phoneInput.classList.add('is-invalid');
      phoneInput.reportValidity(); // shows the native tooltip
      phoneInput.focus();
    } else {
      phoneInput.classList.remove('is-invalid');
    }
  });
})();
