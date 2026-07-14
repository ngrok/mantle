---
"@ngrok/mantle": patch
---

`MultiSelect.Content` no longer applies Ariakit's body scroll lock when its trigger lives inside a mantle modal (`Dialog`, `Sheet`, `AlertDialog`) — the modal already locks body scroll. Starting with `@ariakit/react` 0.4.30, the redundant lock snapshotted the body's inline style (including the modal's transient `pointer-events: none`) and re-applied that stale snapshot on the animation frame after unmount, permanently freezing the page after closing a modal that contained an opened multi-select. Consumers can still override via the `preventBodyScroll` prop.
