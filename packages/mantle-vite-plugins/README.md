# @ngrok/mantle-vite-plugins

Vite plugins for apps built with [`@ngrok/mantle`](https://github.com/ngrok/mantle). The docs page is
[mantle.ngrok.com/vite-plugins](https://mantle.ngrok.com/vite-plugins).

## Requirements

- Node.js 24+
- Vite 8.3 or later
- `@ngrok/mantle` installed in the same project

## Installation

```sh
pnpm add -D -E @ngrok/mantle-vite-plugins
```

## Tailwind sources

Mantle ships `source-all.css`, a single `@source` that covers every component in the package. Import it next to `mantle.css` in your global CSS:

```css
@import "@ngrok/mantle/mantle.css";
@import "@ngrok/mantle/source-all.css";
```

To trim the production stylesheet to the components the bundle contains, add [`mantleSourcesPlugin`](#mantlesourcespluginoptions) to `vite.config.ts`. The CSS stays as above.

Earlier versions of this package shipped `mantleTwSourcePlugin`, which injected per-component `@source` directives. It was removed because its source scan missed files in some setups and produced incomplete CSS. If you used it, remove the `mantleTwSourcePlugin` import and its call from `vite.config.ts`, delete the generated block between the `/* @ngrok/mantle-vite-plugins:source:start */` and `:end` markers in your global CSS, and add the `source-all.css` import above.

## Plugins

### `mantleSourcesPlugin(options?)`

Vite plugin that narrows mantle's Tailwind scan to the files the client bundle contains. Add it next to the Tailwind plugin; the position in the array does not matter.

```ts
import { mantleSourcesPlugin } from "@ngrok/mantle-vite-plugins";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), mantleSourcesPlugin()],
});
```

In `vite dev` the plugin is inactive, so `source-all.css` scans every mantle file. Tailwind styles every component the app can reach. In `vite build`, in the client environment, the plugin reads the bundler's module graph. It replaces the `source-all.css` import with `@source` directives for the `@ngrok/mantle` files the graph holds, chunks and dynamic imports included. That is one `@source` per directory, plus an `@source not` for every neighbor outside the graph. The build logs one line:

```
mantle sources: 6 @ngrok/mantle files listed for src/app.css (source-all.css scans 248)
```

After the bundle is final, the plugin compares the list with every chunk. If the bundle holds a mantle file the CSS does not list, the build fails and names the file and one of two causes. Either another plugin added a chunk after the CSS transform ran: move that plugin's emit earlier. Or the wait for the module graph gave up before a slow module parsed: raise `idleTimeoutMs`. In both cases `onMiss: "warn"` logs the miss and ships the CSS without those classes instead. The server build gets no rewrite. When one `vite build --app` run also builds the server and bundles mantle into it (`ssr.noExternal`), the plugin warns about a mantle file that only the server graph reaches. Such a component has no classes in the client CSS. The `@source not` lines apply to every `@source` that walks the same directory. A directory `@source` of your own that overlaps mantle's files loses the same neighbors.

The `source-all.css` import must sit in a CSS file Vite processes. An import chain that Tailwind resolves on its own is invisible to the plugin.

#### Options

| Option          | Type                | Default   | Description                                                                                                                                                                                    |
| --------------- | ------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onMiss`        | `"error" \| "warn"` | `"error"` | What the build does when the client bundle holds a mantle or `include` file the CSS does not list. `"error"` fails the build; `"warn"` logs the file.                                          |
| `include`       | `string[]`          | `[]`      | Package names whose reached files the plugin lists too. Use it for a component package that sets Tailwind classes on mantle parts.                                                             |
| `verbose`       | `boolean`           | `false`   | Print every listed path.                                                                                                                                                                       |
| `idleTimeoutMs` | `number`            | `15000`   | How long the CSS waits with no module event before it lists the files parsed so far. When one module, such as a `?worker` sub-build, takes longer, raise it; `Infinity` waits for events only. |

### `mantleCodeBlockPlugins(options?)`

Unified helper that returns plugin lists for both Vite and MDX integration surfaces — runtime tagged template transforms and rehype-based fenced code block highlighting.

```ts
import { mantleCodeBlockPlugins } from "@ngrok/mantle-vite-plugins";
import mdx from "@mdx-js/rollup";
import { defineConfig } from "vite";

const codeBlockPlugins = mantleCodeBlockPlugins();

export default defineConfig({
	plugins: [
		...codeBlockPlugins.vitePlugins,
		mdx({
			rehypePlugins: [...codeBlockPlugins.rehypePlugins],
		}),
	],
});
```

#### Options

| Option    | Type      | Default | Description                                                            |
| --------- | --------- | ------- | ---------------------------------------------------------------------- |
| `runtime` | `boolean` | `true`  | Enable runtime transforms for `` mantleCode("lang")`...` `` templates. |
| `mdx`     | `boolean` | `true`  | Enable MDX fenced code block highlighting via a rehype plugin.         |

#### Return Value

| Field           | Type             | Description                                       |
| --------------- | ---------------- | ------------------------------------------------- |
| `vitePlugins`   | `PluginOption[]` | Vite plugins to spread into your `plugins` array. |
| `rehypePlugins` | `Plugin[]`       | Rehype plugins to spread into your MDX pipeline.  |

### `mantleCodeRehypePlugin`

Rehype plugin that pre-renders MDX fenced code blocks with Shiki and attaches the resulting HTML to `<pre>` props. Use directly in a `rehypePlugins` array, or via `mantleCodeBlockPlugins()`.

```ts
import { mantleCodeRehypePlugin } from "@ngrok/mantle-vite-plugins";

mdx({
	rehypePlugins: [mantleCodeRehypePlugin],
});
```

Supports metastring options on fenced code blocks:

````md
```typescript showLineNumbers highlightLines={[1, 3]} title="example.ts"
const x = 1;
const y = 2;
const z = 3;
```
````

### `mantleCodeVitePlugin`

Vite plugin that transforms `` mantleCode("lang")`...` `` tagged template literals at build time into pre-rendered Shiki HTML objects. Included automatically when using `mantleCodeBlockPlugins()`.

## TypeScript

Type declarations are included. No `@types/*` package is needed.

## Related Packages

- [`@ngrok/mantle`](https://github.com/ngrok/mantle/tree/main/packages/mantle) — UI component library ([npm](https://www.npmjs.com/package/@ngrok/mantle))
- [`@ngrok/mantle-server-syntax-highlighter`](https://github.com/ngrok/mantle/tree/main/packages/mantle-server-syntax-highlighter) — Server-side highlighting engine ([npm](https://www.npmjs.com/package/@ngrok/mantle-server-syntax-highlighter))
