---
"@ngrok/mantle": patch
---

`useLocalStorage` and `useSessionStorage` now guard every storage access. Before, a `setItem` that threw (a full origin, Safari private browsing, blocked site data) skipped the sync event, so the hook's value never advanced and the caller got no signal: a dismissible banner that gates its visibility on the stored value never closed. A storage read that threw during render took down the subtree.

If a write fails, the hook now keeps the value in memory, so every same-key instance still advances until the page reloads. A later write that succeeds, or a `storage` event from another document, restores storage as the source of truth. If the browser denies storage access, the read resolves to the default instead of throwing.
