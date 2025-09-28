(async function injectPartials(){
  const inject = async (selector, url) => {
    const host = document.querySelector(selector);
    if (!host) return;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const html = await res.text();
      host.innerHTML = html;
      document.dispatchEvent(
        new CustomEvent("partials:loaded", { detail: { selector, url }})
      );
    } catch (e) {
      console.error(`Failed to inject ${url}`, e);
    }
  };

  await inject("[data-include=header]", "/partials/header.html");
  await inject("[data-include=footer]", "/partials/footer.html");
})();

// Inject header and footer (Rick-8 style) and fire an event when done.
(async function injectPartials() {
  async function injectHost(host) {
    const url = host.getAttribute("data-src");
    if (!url) return;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const html = await res.text();
      host.innerHTML = html;
      document.dispatchEvent(new CustomEvent("partials:loaded", { detail: { url } }));
    } catch (e) {
      console.error("Failed to inject", url, e);
    }
  }

  const hosts = document.querySelectorAll("[data-include]");
  for (const host of hosts) {
    await injectHost(host);
  }
})();