/* =========================================
   main.js — Shadow Force
   ========================================= */

/* --- Footer year --- */
function setYear() {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
}

/* --- RSVP (Formspree + conditional accordion) --- */
/* =========================================
   RSVP logic (access gate + Formspree)
   - UPPERCASE + no spaces when typing
   - Access Granted/Denied with contact link
   - Radios enabled only when granted
   - YES/NO accordions managed via Bootstrap
   ========================================= */

(function () {
  let rsvpInitialized = false;

  window.setupRSVP = function setupRSVP() {
    if (rsvpInitialized) return; // guard against double init
    const form = document.getElementById("rsvpForm");
    if (!form) return;
    rsvpInitialized = true;

    const alertBox = document.getElementById("rsvpAlert");
    const yesPanel = document.getElementById("rsvpYes");
    const noPanel = document.getElementById("rsvpNo");
    const yesBtn = document.getElementById("rsvpBtnYes");
    const noBtn = document.getElementById("rsvpBtnNo");

    const childInput = document.getElementById("child_name");
    const accessMsg = document.getElementById("accessStatus");
    const radios = form.querySelectorAll('input[name="attending"]');

    // Bootstrap collapse controllers
    const yesCollapse = new bootstrap.Collapse(yesPanel, { toggle: false });
    const noCollapse = new bootstrap.Collapse(noPanel, { toggle: false });

    // Fields required only when attending = yes
    const conditionalRequired = form.querySelectorAll(
      '[data-required-when="yes"]'
    );

    // Helpers
    function applyMode(mode) {
      if (mode === "yes") {
        yesCollapse.show();
        noCollapse.hide();
        conditionalRequired.forEach((el) =>
          el.setAttribute("required", "required")
        );
      } else if (mode === "no") {
        noCollapse.show();
        yesCollapse.hide();
        conditionalRequired.forEach((el) => el.removeAttribute("required"));
        // clear validation on hidden fields
        conditionalRequired.forEach((el) =>
          el.classList.remove("is-invalid", "is-valid")
        );
      } else {
        yesCollapse.hide();
        noCollapse.hide();
        conditionalRequired.forEach((el) => el.removeAttribute("required"));
      }
    }

    function disableRadios(disabled) {
      radios.forEach((r) => {
        r.disabled = disabled;
        if (disabled) r.checked = false;
      });
    }

    function showAlert(type, message) {
      if (!alertBox) return;
      alertBox.className = `alert alert-${type}`;
      alertBox.textContent = message;
      alertBox.classList.remove("d-none");
      alertBox.focus?.();
    }

    function setLoading(loading) {
      [yesBtn, noBtn].forEach((btn) => {
        if (btn) {
          btn.disabled = loading;
          const isNo = btn.id === "rsvpBtnNo";
          btn.textContent = loading
            ? "Sending…"
            : isNo
            ? "Send RSVP (No)"
            : "Send RSVP (Yes)";
        }
      });
    }

    // ===== ACCESS GATE =====
    const NAMES_URL = new URL("assets/data/names.json", document.baseURI);

    // Normalizer: UPPERCASE + remove ALL spaces
    const normKey = (s) =>
      (s || "").toString().trim().toUpperCase().replace(/\s+/g, "");

    let allowSet = null;
    async function getAllowSet() {
      if (allowSet) return allowSet;
      const res = await fetch(NAMES_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const list = await res.json();
      allowSet = new Set((Array.isArray(list) ? list : []).map(normKey));
      return allowSet;
    }

    function setAccess(ok, isError, nameText) {
      if (!accessMsg) return;

      if (ok === null) {
        accessMsg.className = "mt-2 d-none";
        accessMsg.textContent = "";
        return;
      }

      if (ok) {
        accessMsg.className = "alert alert-success mt-2";
        accessMsg.innerHTML =
          '🟢 <strong>Access Granted.</strong> Welcome, agent <span class="agent-name"></span>.';
        // Safely inject the name (no HTML)
        const span = accessMsg.querySelector(".agent-name");
        if (span) span.textContent = nameText || "";
      } else {
        accessMsg.className = "alert alert-danger mt-2";
        accessMsg.innerHTML = isError
          ? '🔴 <strong>Access Check Unavailable.</strong> Please try again later or <a class="alert-link" href="#contact">contact us</a>.'
          : '🔴 <strong>Access Denied.</strong> Name not on the mission roster. <a class="alert-link" href="#contact">Contact us</a>.';
      }

      accessMsg.classList.remove("d-none");
    }

    async function validateName() {
      const nameKey = normKey(childInput.value);
      if (!nameKey) {
        setAccess(null);
        disableRadios(true);
        applyMode(null);
        childInput.classList.remove("is-valid", "is-invalid");
        return;
      }
      try {
        const set = await getAllowSet();
        const ok = set.has(nameKey);

        // 👉 hand the DISPLAY name (what’s in the box) to setAccess
        setAccess(ok, false, childInput.value);

        disableRadios(!ok);
        childInput.classList.toggle("is-valid", ok);
        childInput.classList.toggle("is-invalid", !ok);
        if (!ok) applyMode(null);
      } catch (err) {
        console.error("Failed to load names.json", err);
        setAccess(false, true); // show “Access Check Unavailable”
        disableRadios(true);
        applyMode(null);
      }
    }

    // INIT: gate is closed until valid name
    disableRadios(true);
    applyMode(null);

    // As-you-type: force UPPERCASE and remove spaces, then validate (debounced)
    let debounce;
    childInput.addEventListener("input", () => {
      const cleaned = childInput.value.toUpperCase().replace(/\s+/g, "");
      if (childInput.value !== cleaned) {
        childInput.value = cleaned;
        // put caret at the end (fine for short names)
        try {
          childInput.setSelectionRange(cleaned.length, cleaned.length);
        } catch {}
      }
      clearTimeout(debounce);
      debounce = setTimeout(validateName, 150);
    });

    // Optional: block spacebar entirely in this field
    childInput.addEventListener("keydown", (e) => {
      if (e.key === " ") e.preventDefault();
    });

    childInput.addEventListener("blur", validateName);

    // React to radio changes (only after gate opens)
    radios.forEach((r) => {
      r.addEventListener("change", () => applyMode(r.value));
    });

    // ===== SUBMIT to Formspree =====
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Don’t submit if gate closed
      const blocked = Array.from(radios).every((r) => r.disabled);
      if (blocked) {
        setAccess(false);
        childInput.focus();
        return;
      }

      // Bootstrap validation
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }

      // Honeypot (anti-spam)
      const hp = form.querySelector('[name="hp"]');
      if (hp && hp.value) {
        return showAlert("success", "Thanks! Your RSVP has been received.");
      }

      const fd = new FormData(form);
      const child = fd.get("child_name") || "";
      const attending = (fd.get("attending") || "").toUpperCase();

      // Nice subject line in your email
      fd.set("_subject", `RSVP: ${child} – ${attending || "REPLY"}`);

      const endpoint = form.getAttribute("action"); // https://formspree.io/f/...
      try {
        setLoading(true);
        const res = await fetch(endpoint, {
          method: "POST",
          body: fd,
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          form.reset();
          form.classList.remove("was-validated");
          // reset gate/UI
          disableRadios(true);
          applyMode(null);
          setAccess(null);
          childInput.classList.remove("is-valid", "is-invalid");
          showAlert("success", "✅ Thanks! Your RSVP has been sent.");
        } else {
          const data = await res.json().catch(() => ({}));
          const msg =
            data?.error ||
            data?.errors?.[0]?.message ||
            "Something went wrong sending your RSVP.";
          showAlert("danger", `❌ ${msg} Please try again.`);
        }
      } catch (err) {
        console.error(err);
        showAlert(
          "danger",
          "❌ Network error. Please check your connection and try again."
        );
      } finally {
        setLoading(false);
      }
    });
  };

  // Auto-initialise on pages that have the form
  document.addEventListener("DOMContentLoaded", window.setupRSVP);
})();

/* --- Highlight active nav once partials are injected --- */
document.addEventListener("partials:loaded", () => {
  // Determine current file (works with <base href="/Shadow-Force/">)
  const path = location.pathname.replace(/\/+$/, "");
  let file = path.split("/").pop();
  if (!file) file = "index.html";

  document.querySelectorAll(".navbar-nav .nav-link").forEach((a) => {
    const href = (a.getAttribute("href") || "")
      .split("#")[0]
      .replace(/\/+$/, "");
    // Treat empty href as index
    const normalized = href || "index.html";
    if (normalized.endsWith(file)) a.classList.add("active");
  });

  setYear();
});

/* --- Start page-specific logic after DOM is ready --- */
document.addEventListener("DOMContentLoaded", () => {
  setupRSVP();

  // Typewriter heading for countdown (index only)
  const tw = document.querySelector(".typewriter");
  if (tw) {
    const text = tw.getAttribute("data-text") || tw.textContent.trim();
    tw.textContent = ""; // clear first
    let i = 0;
    const speed = 80; // ms per char

    function type() {
      if (i < text.length) {
        tw.textContent += text.charAt(i++);
        setTimeout(type, speed);
      } else {
        // enable blinking caret + glow (CSS .typewriter.is-done)
        tw.classList.add("is-done");
      }
    }
    type();
  }
});

/* --- Countdown to 1 Nov 2025, 13:25 UK time (index page) --- */
(function startCountdown() {
  const box = document.getElementById("countdown");
  if (!box) return;

  // Use explicit UTC offset to avoid viewer timezone drift; London is GMT on Nov 1, 2025
  const target = new Date("2025-11-01T13:25:00+00:00");

  const days = box.querySelector('[data-ct="days"]');
  const hours = box.querySelector('[data-ct="hours"]');
  const mins = box.querySelector('[data-ct="mins"]');
  const secs = box.querySelector('[data-ct="secs"]');

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tick() {
    const now = new Date();
    let diff = Math.max(0, target - now);

    const d = Math.floor(diff / 86400000);
    diff -= d * 86400000;
    const h = Math.floor(diff / 3600000);
    diff -= h * 3600000;
    const m = Math.floor(diff / 60000);
    diff -= m * 60000;
    const s = Math.floor(diff / 1000);

    if (days) days.textContent = String(d);
    if (hours) hours.textContent = pad(h);
    if (mins) mins.textContent = pad(m);
    if (secs) secs.textContent = pad(s);

    if (target - now <= 0) {
      box.innerHTML = `<div class="alert alert-success mt-3" role="alert">
        ✅ Mission start: Agents, report to HQ. Good luck!
      </div>`;
      clearInterval(timer);
    }
  }
  tick();
  const timer = setInterval(tick, 1000);
})();

/* --- Open in Maps (details page) --- */
(function setupMapsButtons() {
  const btn = document.getElementById("navToVenueBtn");
  const gLink = document.getElementById("gmapsLink");
  const aLink = document.getElementById("appleMapsLink");
  if (!btn && !gLink && !aLink) return;

  const address = "Brunel Shopping Centre, Bletchley, Milton Keynes MK2 2ES";
  const dest = encodeURIComponent(address);

  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  const appleWeb = `https://maps.apple.com/?daddr=${dest}`;
  const appleDeep = `maps://?daddr=${dest}`; // iOS deep link

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (btn) {
    btn.addEventListener("click", () => {
      const url = isIOS ? appleDeep : googleUrl;
      window.location.href = url;
    });
  }

  if (gLink) gLink.href = googleUrl;
  if (aLink) aLink.href = appleWeb;
})();
