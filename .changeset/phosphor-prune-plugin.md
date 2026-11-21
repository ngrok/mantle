---
"@ngrok/mantle-vite-plugins": patch
---

Add `mantlePhosphorPrunePlugin`. It removes the `@phosphor-icons/react` icon weights that a build never renders. Each Phosphor icon holds the paths of all six weights, and a bundler ships all six without the plugin.

- The plugin reads the `weight` that each module renders, in JSX and in the compiled `jsx()` and `createElement()` calls of a dependency. A `weight` that a `cloneElement()` call sets stays for every icon. An icon without a `weight` keeps `regular` and each weight that an `IconContext` value of the build sets.
- A kept weight renders the same markup as before.
- When the plugin cannot read a weight (a computed `weight`, a spread of props, or an icon passed as a value), it keeps every weight of that icon. A namespace import keeps every weight of every icon, and the build warns. An icon that a dynamic import or an unread import path reaches keeps every weight.
- An icon imported by another name, such as `ActivityIcon` for `PulseIcon`, keeps every weight of every icon, and the build warns.
- If an icon module of the installed Phosphor has a shape that the plugin does not know, the build warns and keeps all six weights of that icon.

It runs on `vite build` and as a Rolldown or tsdown plugin. On an ngrok.com-like page with 53 icons, Phosphor's icon data drops from 42.1 KB to 11.1 KB gzipped.

```ts
plugins: [mantlePhosphorPrunePlugin()],
```
