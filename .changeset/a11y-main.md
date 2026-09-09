---
"@ngrok/mantle": patch
---

`Main` no longer accepts `id` or `tabIndex`. It always stamps `id="main"` and `tabIndex={-1}`, because `SkipToMainLink` targets `#main` and focuses it, and a value passed through props was silently discarded before this change.
