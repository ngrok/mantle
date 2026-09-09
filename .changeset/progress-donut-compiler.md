---
"@ngrok/mantle": patch
---

`ProgressDonut.Root` now compiles under the React Compiler. It builds the track circle's `style` object before the context `useMemo`, so the compiler can preserve that memo instead of skipping the component. Nothing changes at runtime: the rendered `<svg>`, its ARIA attributes, its data attributes, and the `--radius` variable are the same.
