---
"@ngrok/mantle": patch
---

A callback `ref` passed to `Input` or `InputCapture` now fires once when the `<input>` mounts, as long as you pass the same function on each render. When the `<input>` unmounts, React runs the cleanup your callback returned, or calls the callback once with `null`. Before this change, every re-render of the component detached and re-attached the ref, so the callback saw `null` and then the element again on each re-render. A callback ref that measures the element or sets state no longer pays a layout read or an extra render per re-render.
