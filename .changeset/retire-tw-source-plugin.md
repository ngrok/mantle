---
"@ngrok/mantle-vite-plugins": minor
---

Remove `mantleTwSourcePlugin` and its `MantleTwSourcePluginOptions` type. The plugin scanned app source for `@ngrok/mantle/*` imports and injected per-component Tailwind `@source` directives, but its scan missed source files in some setups and produced incomplete CSS.

Migration: remove the `mantleTwSourcePlugin` import and its call from `vite.config.ts`, along with any `MantleTwSourcePluginOptions` usage. Delete the generated block between the `/* @ngrok/mantle-vite-plugins:source:start */` and `/* @ngrok/mantle-vite-plugins:source:end */` markers in your global CSS. Then add `@import "@ngrok/mantle/source-all.css";` next to your `mantle.css` import so Tailwind scans every mantle component.
