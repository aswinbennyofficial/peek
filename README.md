# Peek

A Firefox extension that recreates [Zen's Glance](https://docs.zen-browser.app/user-manual/glance): **Alt/Option + click** a link to preview it in a floating card over the current page.

This is AI generated code.

## Install
**[Get Peek on Firefox Add-ons](https://addons.mozilla.org/firefox/addon/peek-for-firefox/)**

## Features
- Alt/Option + click a link → floating preview card (Esc or click outside to close)
- Or right-click a link → **Open in Peek**
- Side buttons: close, open in new tab, pop out to mini window, copy link
- Closing a mini window returns it to the glance

<img width="1422" height="1023" alt="image" src="https://github.com/user-attachments/assets/d886918b-0b82-453d-be27-565f5ad66200" />
<img width="1422" height="1023" alt="image" src="https://github.com/user-attachments/assets/9c1cac57-5f8a-4d17-891b-85f889fab238" />

## Load from source (development)
1. Open `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…** → pick `manifest.json`

## Build for addons.mozilla.org
```sh
npx web-ext lint
npx web-ext build   # → web-ext-artifacts/peek-<version>.zip
```
Upload the zip at https://addons.mozilla.org/developers/. No source-code upload is needed (no bundler or minifier).

## Why these permissions
- `<all_urls>` + content script: detect Alt+click on any page and draw the glance.
- `webRequest`, `webRequestBlocking`: remove `X-Frame-Options` / CSP `frame-ancestors` **only for frames Peek opens**, so sites that block embedding can be previewed.
- `tabs`: open links in a new tab and return mini windows to their original tab.
- `menus`: add "Open in Peek" to the link right-click menu.

Peek collects no data.

## Known limits
- Logins may not show inside the glance (Firefox isolates cookies for embedded pages); use "open in new tab".
- The mini window is a normal popup window, not Firefox's built-in mini window.




