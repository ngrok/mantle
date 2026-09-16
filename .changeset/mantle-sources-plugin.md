---
"@ngrok/mantle-vite-plugins": patch
---

Add `mantleSourcesPlugin`, a Vite plugin that narrows mantle's Tailwind scan to the files the client bundle contains. The docs page is [mantle.ngrok.com/vite-plugins](https://mantle.ngrok.com/vite-plugins).

Add it next to the Tailwind plugin. The CSS file does not change: keep `@import "@ngrok/mantle/source-all.css"` where it is.

```ts
import { mantleSourcesPlugin } from "@ngrok/mantle-vite-plugins";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), mantleSourcesPlugin()],
});
```

In `vite dev` the plugin is inactive, so `source-all.css` scans every mantle file. Tailwind styles every component the app can reach. In `vite build`, in the client environment, the plugin reads the bundler's module graph. It replaces the `source-all.css` import with `@source` directives that keep the `@ngrok/mantle` files the graph holds, chunks and dynamic imports included: one per directory, plus an `@source not` for every neighbor outside the graph. The build logs one line, for example `mantle sources: 6 @ngrok/mantle files listed for src/app.css (source-all.css scans 248)`.

After the bundle is final, the plugin compares the list with every chunk. If the bundle holds a mantle file the CSS does not list, the build fails and names the file. Pass `onMiss: "warn"` to log the miss and ship the CSS instead. Pass `include: ["@acme/ui"]` to list the reached files of another package too, for a component package that sets Tailwind classes on mantle parts. The server build gets no rewrite. When the same `vite build --app` run builds it and bundles mantle (`ssr.noExternal`), it warns about a mantle file that only the server graph reaches. `idleTimeoutMs` (default 15000) bounds how long the CSS waits with no module event before it lists the files parsed so far.

On a Vite 8.3.0 app that renders `Badge` from mantle 0.85.2 with Tailwind 4.3.3, the minified stylesheet went from 180.9 KB with `source-all.css` to 71.1 KB with the plugin, which kept 6 of the 137 dist scripts.
