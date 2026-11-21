---
"@ngrok/mantle": patch
---

Ship mantle's Phosphor icons with only the weights mantle renders. The package bundles each icon module it uses and drops the weights no mantle component renders, so an app gets the smaller icons with no setup. On a page that imports every mantle component, mantle's icon data drops from 16.7 KB to 7.8 KB gzipped.

- `@phosphor-icons/react` stays a peer dependency. mantle's icons import its `IconBase` and `IconContext` from your installed copy, so they share one runtime with your own icons.
- A mantle icon that renders without a `weight` keeps `regular` only. If your app sets another weight through `IconContext`, that icon renders empty.
