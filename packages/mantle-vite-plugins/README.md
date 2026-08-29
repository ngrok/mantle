# @ngrok/mantle-vite-plugins

Vite plugins for apps built with [`@ngrok/mantle`](https://github.com/ngrok/mantle).

## Requirements

- Node.js 24+
- Vite 8+
- `@ngrok/mantle` installed in the same project

## Installation

```sh
pnpm add -D -E @ngrok/mantle-vite-plugins
```

## Tailwind sources

Mantle ships `source-all.css` — a single `@source` that covers every component in the package. Import it alongside `mantle.css` in your global CSS:

```css
@import "@ngrok/mantle/mantle.css";
@import "@ngrok/mantle/source-all.css";
```

Earlier versions of this package shipped `mantleTwSourcePlugin`, which injected per-component `@source` directives. It was removed because its source scan missed files in some setups and produced incomplete CSS. If you used it, remove the `mantleTwSourcePlugin` import and its call from `vite.config.ts`, delete the generated block between the `/* @ngrok/mantle-vite-plugins:source:start */` and `:end` markers in your global CSS, and add the `source-all.css` import above.

## Plugins

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
