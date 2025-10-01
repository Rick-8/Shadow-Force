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
   RSVP logic (NO access gate here)
   - Access gate moved to assets/js/access-check.js
   - This file:
     • Manages YES/NO collapses
     • Applies conditional required fields
     • Handles Formspree submission + alerts
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

    const radios = form.querySelectorAll('input[name="attending"]');

    // Bootstrap collapse controllers
    const yesCollapse = new bootstrap.Collapse(yesPanel, { toggle: false });
    const noCollapse  = new bootstrap.Collapse(noPanel,  { toggle: false });

    // Fields required only when attending = yes
    const conditionalRequired = form.querySelectorAll('[data-required-when="yes"]');

    // Helpers
    function applyMode(mode) {
      if (mode === "yes") {
        yesCollapse.show();
        noCollapse.hide();
        conditionalRequired.forEach((el) => el.setAttribute("required", "required"));
      } else if (mode === "no") {
        noCollapse.show();
        yesCollapse.hide();
        conditionalRequired.forEach((el) => el.removeAttribute("required"));
        // clear validation on hidden fields
        conditionalRequired.forEach((el) => el.classList.remove("is-invalid", "is-valid"));
      } else {
        yesCollapse.hide();
        noCollapse.hide();
        conditionalRequired.forEach((el) => el.removeAttribute("required"));
      }
    }

    function showAlert(type, message) {
      if (!alertBox) return;
      alertBox.className = `alert alert-${type}`;
      alertBox.innerHTML = message;
      alertBox.classList.remove("d-none");
      alertBox.focus?.();
    }

    function setLoading(loading) {
      [yesBtn, noBtn].forEach((btn) => {
        if (btn) {
          btn.disabled = loading;
          const isNo = btn.id === "rsvpBtnNo";
          btn.textContent = loading ? "Sending…" : (isNo ? "Send RSVP (No)" : "Send RSVP (Yes)");
        }
      });
    }

    // Radios change → toggle the sections
    radios.forEach((r) => {
      r.addEventListener("change", () => applyMode(r.value));
    });

    // INIT: access-check.js will enable/disable radios. Default to hidden.
    applyMode(null);

    // ===== SUBMIT to Formspree =====
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // If both radios are disabled, access hasn’t been granted yet.
      const blocked = Array.from(radios).every((r) => r.disabled);
      if (blocked) {
        showAlert(
          "warning",
          "Please use the <strong>Check access</strong> button above first. Once access is granted, you can complete your RSVP."
        );
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
        // Pretend success to bots
        const card = form.closest(".card");
        if (card) {
          card.innerHTML = `
            <div class="text-center py-5">
              <div class="alert alert-success fs-5" role="alert">
                ✅ Thanks! Your RSVP has been sent.
              </div>
              <p class="mt-3">We look forward to seeing you on mission day!</p>
            </div>
          `;
        }
        return;
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
          // Replace the entire form card with a success message (clears page)
          const card = form.closest(".card");
          if (card) {
            card.innerHTML = `
              <div class="text-center py-5">
                <div class="alert alert-success fs-5" role="alert">
                  ✅ Thanks! Your RSVP has been sent.
                </div>
                <p class="mt-3">We look forward to seeing you on mission day!</p>
              </div>
            `;
            // Optional: scroll to the top of the card for visibility
            card.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        } else {
          const data = await res.json().catch(() => ({}));
          const msg = data?.error || data?.errors?.[0]?.message || "Something went wrong sending your RSVP.";
          showAlert("danger", `❌ ${msg} Please try again.`);
        }
      } catch (err) {
        console.error(err);
        showAlert("danger", "❌ Network error. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    });
  };
})();

/* --- Highlight active nav once partials are injected --- */
document.addEventListener("partials:loaded", () => {
  // Determine current file (works with <base href="/Shadow-Force/">)
  const path = location.pathname.replace(/\/+$/, "");
  let file = path.split("/").pop();
  if (!file) file = "index.html";

  document.querySelectorAll(".navbar-nav .nav-link").forEach((a) => {
    const href = (a.getAttribute("href") || "").split("#")[0].replace(/\/+$/, "");
    // Treat empty href as index
    const normalized = href || "index.html";
    if (normalized.endsWith(file)) a.classList.add("active");
  });

  setYear();
});

/* --- Start page-specific logic after DOM is ready --- */
document.addEventListener("DOMContentLoaded", () => {
  // Initialise RSVP (access gate handled separately in access-check.js)
  if (typeof window.setupRSVP === "function") window.setupRSVP();

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

  const days  = box.querySelector('[data-ct="days"]');
  const hours = box.querySelector('[data-ct="hours"]');
  const mins  = box.querySelector('[data-ct="mins"]');
  const secs  = box.querySelector('[data-ct="secs"]');

  function pad(n) { return String(n).padStart(2, "0"); }

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

    if (days)  days.textContent  = String(d);
    if (hours) hours.textContent = pad(h);
    if (mins)  mins.textContent  = pad(m);
    if (secs)  secs.textContent  = pad(s);

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
  const btn   = document.getElementById("navToVenueBtn");
  const gLink = document.getElementById("gmapsLink");
  const aLink = document.getElementById("appleMapsLink");
  if (!btn && !gLink && !aLink) return;

  const address = "Brunel Shopping Centre, Bletchley, Milton Keynes MK2 2ES";
  const dest = encodeURIComponent(address);

  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  const appleWeb  = `https://maps.apple.com/?daddr=${dest}`;
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
