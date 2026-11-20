const send = (m) => browser.runtime.sendMessage(m);

// Capture phase so we beat the page and Firefox's default Alt+click (= download link).
addEventListener("click", (e) => {
  if (!e.altKey || e.button !== 0) return;
  const a = e.target.closest?.("a[href]");
  if (!a || !/^https?:/.test(a.href)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  send({ open: a.href });
}, true);

addEventListener("keydown", (e) => { if (e.key === "Escape") send({ close: true }); }, true);

if (window === top) {
  let host = null;

  const CSS = `
    .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); backdrop-filter: blur(3px);
      opacity: 0; transition: opacity .2s ease; }
    .card { position: fixed; top: 7.5vh; left: 50%; width: 85vw; height: 85vh;
      transform: translateX(-50%) scale(.92); opacity: 0; border-radius: 12px; overflow: hidden;
      background: #fff; box-shadow: 0 20px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.08);
      transition: transform .25s cubic-bezier(.2,.9,.3,1.2), opacity .2s ease; }
    iframe { width: 100%; height: 100%; border: 0; display: block; }
    .bar { position: fixed; top: 7.5vh; left: calc(50% + 85vw / 2 + 10px);
      display: flex; flex-direction: column; gap: 8px; opacity: 0; transition: opacity .2s ease .1s; }
    button { all: unset; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
      background: rgba(30,30,30,.85); color: #eee; font: 16px/1 system-ui; cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,.3); transition: background .15s, transform .15s; }
    button:hover { background: rgba(60,60,60,.95); transform: scale(1.08); }
    button:focus-visible { outline: 2px solid #8ab4f8; }
    .backdrop.in, .bar.in { opacity: 1; }
    .card.in { opacity: 1; transform: translateX(-50%) scale(1); }
    .toast { position: fixed; bottom: 3vh; left: 50%; transform: translate(-50%, 8px);
      padding: 6px 14px; border-radius: 999px; background: rgba(30,30,30,.92); color: #fff;
      font: 500 13px/1.4 system-ui; opacity: 0; pointer-events: none; transition: opacity .15s, transform .15s; }
    .toast.show { opacity: 1; transform: translate(-50%, 0); }
    @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`;

  function open(url) {
    close(true);
    host = document.createElement("div");
    host.style.cssText = "all: initial; position: fixed; inset: 0; z-index: 2147483647;";
    const root = host.attachShadow({ mode: "closed" }); // isolates our styles from the page
    root.innerHTML = `
      <div class="backdrop"></div>
      <div class="card"><iframe></iframe></div>
      <div class="bar">
        <button data-a="close" title="Close (Esc)" aria-label="Close (Esc)"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <button data-a="expand" title="Open in new tab" aria-label="Open in new tab"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>
        <button data-a="mini" title="Pop out to mini window" aria-label="Pop out to mini window"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><rect x="12" y="12" width="7" height="6" rx="1" fill="currentColor"/></svg></button>
        <button data-a="copy" title="Copy link" aria-label="Copy link"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg></button>
      </div>
      <div class="toast" role="status">Link copied</div>`;
    const style = document.createElement("style");
    style.textContent = CSS;
    root.prepend(style);
    root.querySelector("iframe").src = url;
    root.querySelector(".backdrop").onclick = () => close();
    root.querySelector(".bar").onclick = (e) => {
      const a = e.target.closest("button")?.dataset.a;
      if (a === "close") close();
      if (a === "expand") send({ expand: url });
      if (a === "mini") send({ mini: url });
      if (a === "copy") navigator.clipboard.writeText(url).then(toast);
    };
    document.documentElement.append(host);
    host._root = root;
    requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll(".backdrop,.card,.bar").forEach((el) => el.classList.add("in"))));
  }

  let toastTimer;
  function toast() {
    const t = host._root.querySelector(".toast");
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1500);
  }

  function close(instant) {
    if (!host) return;
    const h = host; host = null;
    if (instant) return h.remove();
    h._root.querySelectorAll(".in").forEach((el) => el.classList.remove("in"));
    setTimeout(() => h.remove(), 220);
  }

  browser.runtime.onMessage.addListener((m) => { if (m.open) open(m.open); if (m.close) close(); });
}

