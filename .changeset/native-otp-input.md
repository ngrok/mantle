---
"@ngrok/mantle": patch
---

`OtpInput` no longer depends on `input-otp`. `OtpInput.Root` renders its own native `<input>` over the slots, with `autocomplete="one-time-code"`, `inputmode="numeric"`, `maxlength`, and `pattern`, so typing, paste, IME, SMS fill, and password manager fill stay with the browser. The parts, the props, the look, the server HTML, and the accessibility tree do not change.

- The `otp-input` entry is about 1.7 KB smaller (gzip). It adds no `<style>` element at runtime, and the input's styles are static CSS in the `otp-input-overlay` utility of `mantle.css`.
- An `OtpInput` has no timers and no listeners while it is not focused. Each instance no longer measures its ancestors once a second, and it listens for `selectionchange` only while it has focus.
- On a page with 200 codes (Chromium, 4× CPU slowdown), the script time until hydration is about half, and hydration ends 17 to 34% sooner across three measured runs.
- In right-to-left text, a click on the code puts the caret after the last character, so typing appends. The outer corners of each group are rounded on the correct side.
- `OtpInput.Slot` outside `OtpInput.Root` throws a descriptive error.
- `OtpInput.Root` no longer takes `nonce`, because it adds no `<style>` element.
- With JavaScript off, the fallback input uses mantle's form colors. It needs `@media (scripting: none)` (Chrome 120, Safari 17, Firefox 113). A `noScriptCSSFallback` string still renders in a `<noscript>`.

https://mantle.ngrok.com/components/forms/otp-input
