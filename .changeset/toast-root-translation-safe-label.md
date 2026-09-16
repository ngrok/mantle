---
"@ngrok/mantle": patch
---

`Toast.Root` now renders `children` inside a `<div data-slot="toast-label">`. The intent accent bar is a permanent element sibling, so a bare text child was never a lone child: on a page a browser translation engine had translated, the removal React runs when the content changes shape or goes away raised `NotFoundError` and blanked the page. A toast that `makeToast` updates in place under a repeated id took that path.

The wrapper is a `<div>` because `Toast.Message` renders a `<p>`, which a `<span>` may not contain. It is `display: contents`, so the icon, the message, and an action stay flex items of the root and `Toast.Message`'s `flex-1` still resolves.

`toast-label` is public API, and the docs page lists it beside `toast`. It wraps everything you pass the root, not only the message text.
