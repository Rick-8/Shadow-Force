/* assets/js/include.js */
(function () {
  async function injectHost(host) {
    const url = host.getAttribute("data-src");
    if (!url) return;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      host.innerHTML = await res.text();
      document.dispatchEvent(new CustomEvent("partials:loaded", { detail: { el: host, url } }));
    } catch (err) {
      console.error("[partials] Failed to inject", url, err);
      host.innerHTML = `<!-- failed to load ${url} -->`;
    }
  }

  async function run() {
    const hosts = document.querySelectorAll("[data-include]");
    await Promise.all([...hosts].map(injectHost));
    document.dispatchEvent(new CustomEvent("partials:all-loaded"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
