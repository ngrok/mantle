---
"@ngrok/mantle": patch
---

`Command.DialogRoot` and `Sidebar.Root` no longer throw on a `keydown` that carries no `key`.

Both bind a `window` listener for their chord. The listener reads `event.key.toLowerCase()`. The DOM type promises a string, so the read looked safe. A browser extension or a password manager can dispatch a bare `Event("keydown")` instead of a real `KeyboardEvent`. The listener then threw `Cannot read properties of undefined (reading 'toLowerCase')` on the page. Both listeners now read the key optionally. They ignore an event that names no key.
