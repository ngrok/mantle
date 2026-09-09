---
"@ngrok/mantle": patch
---

`useBreakpoint` now returns the real breakpoint in the first render of a client mount. Before this change, the first client render of any consumer returned `"default"`. React then forced a second render with the real value, so a layout keyed on the breakpoint could paint its mobile variant for one frame on a desktop viewport. The same happened on every mount after the last consumer unmounted and the viewport changed in between. The server render and the hydration render still return `"default"`.
