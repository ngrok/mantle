---
"@ngrok/mantle": patch
---

A `Dialog.Body` or `Sheet.Body` that scrolls no longer fires a "ResizeObserver loop completed with undelivered notifications" error in Safari when its dialog closes. A test runner or an error monitor that listens for `error` events on `window` no longer reports it.
