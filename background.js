const pending = new Set();   // URLs about to load in a glance frame
const allowed = new Set();   // "tabId:frameId" of live glance frames

const minis = new Map(); // mini window id -> { origin tab id, current url }

browser.runtime.onMessage.addListener(async (msg, sender) => {
  const tabId = sender.tab.id;
  if (msg.open) pending.add(msg.open);
  if (msg.expand) { browser.tabs.create({ url: msg.expand, index: sender.tab.index + 1 }); msg = { close: true }; }
  if (msg.mini) { mini(msg.mini, sender.tab); msg = { close: true }; }
  // Always relay to the top frame, which owns the overlay (clicks may come from inside iframes).
  browser.tabs.sendMessage(tabId, msg, { frameId: 0 });
});

// Strip frame-blocking headers, but only for frames Glance opened (keeps clickjacking protection elsewhere).
browser.webRequest.onHeadersReceived.addListener((d) => {
  const key = `${d.tabId}:${d.frameId}`;
  if (!pending.delete(d.url) && !allowed.has(key)) return;
  allowed.add(key);
  return {
    responseHeaders: d.responseHeaders.filter((h) => {
      const n = h.name.toLowerCase();
      if (n === "x-frame-options") return false;
      if (n === "content-security-policy") h.value = h.value.replace(/frame-ancestors[^;]*;?/gi, "");
      return true;
    }),
  };
}, { urls: ["<all_urls>"], types: ["sub_frame"] }, ["blocking", "responseHeaders"]);

browser.tabs.onRemoved.addListener((tabId) => {
  for (const k of allowed) if (k.startsWith(tabId + ":")) allowed.delete(k);
});

// shortcut: plain small popup window; Firefox's native "mini window" (always-on-top) has no extension API I could confirm.
async function mini(url, tab) {
  const p = await browser.windows.get(tab.windowId);
  const width = 420, height = 640;
  const w = await browser.windows.create({ url, type: "popup", width, height,
    left: p.left + p.width - width - 24, top: p.top + p.height - height - 24 });
  minis.set(w.id, { origin: tab.id, url });
}

// Track navigation inside the mini window so closing it returns the page the user ended on.
browser.tabs.onUpdated.addListener((_, change, tab) => {
  if (change.url && minis.has(tab.windowId)) minis.get(tab.windowId).url = change.url;
});

// Closing a mini window sends it back into a glance on its origin tab.
browser.windows.onRemoved.addListener(async (id) => {
  const m = minis.get(id);
  if (!m) return;
  minis.delete(id);
  const o = await browser.tabs.get(m.origin).catch(() => null);
  if (!o) return; // origin tab gone: nothing to return to
  pending.add(m.url);
  await browser.windows.update(o.windowId, { focused: true });
  await browser.tabs.update(o.id, { active: true });
  browser.tabs.sendMessage(o.id, { open: m.url }, { frameId: 0 });
});

// Right-click a link → "Open in Peek".
browser.menus.create({ id: "peek", title: "Open in Peek", contexts: ["link"], targetUrlPatterns: ["http://*/*", "https://*/*"] });
browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "peek") return;
  pending.add(info.linkUrl);
  // Fails on pages where content scripts can't run (about:, addons store); nothing to draw on there.
  browser.tabs.sendMessage(tab.id, { open: info.linkUrl }, { frameId: 0 }).catch(() => pending.delete(info.linkUrl));
});
