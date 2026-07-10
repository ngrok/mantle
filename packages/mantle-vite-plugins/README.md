# @ngrok/mantle-vite-plugins

Vite plugins for apps built with [`@ngrok/mantle`](https://github.com/ngrok/mantle).

## Requirements

- Node.js 24+
- Vite 5+
- `@ngrok/mantle` installed in the same project

## Installation

```sh
pnpm add -D -E @ngrok/mantle-vite-plugins
```

## Plugins

### `mantleTwSourcePlugin`

Scans your app's source files for `@ngrok/mantle/*` component imports and injects Tailwind CSS `@source` directives into your global CSS file for only those components — so Tailwind only scans the mantle components your app actually uses, reducing generated CSS bundle size with no manual maintenance.

#### When to use

Mantle ships `source-all.css` as the zero-configuration option — a single `@source` that covers every component in the package:

```css
@import "@ngrok/mantle/mantle.css";
@import "@ngrok/mantle/source-all.css";
```

Use `mantleTwSourcePlugin` instead when your app uses a subset of mantle components and you want the smallest possible CSS output. The plugin scans your source files, detects which components you import, and writes targeted `@source` directives for only those components.

| Approach               | When to use                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `source-all.css`       | Your app uses most or all mantle components, or you want zero build tooling configuration. |
| `mantleTwSourcePlugin` | Your app uses a subset of mantle components and you want the smallest possible CSS output. |

If you are unsure, start with `source-all.css`.

#### Setup

**1. Add the plugin to `vite.config.ts`:**

```ts
import { mantleTwSourcePlugin } from "@ngrok/mantle-vite-plugins";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [mantleTwSourcePlugin()],
});
```

**2. In your global CSS, import `mantle.css` without `source-all.css`:**

```css
@import "tailwindcss";
@import "@ngrok/mantle/mantle.css";
/* do NOT add @import "@ngrok/mantle/source-all.css" */
```

That is all. The plugin writes the correct `@source` lines into your CSS file before `@tailwindcss/vite` processes it.

#### Options

| Option      | Type       | Default                                                                               | Description                                                                                                                                                                   |
| ----------- | ---------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `include`   | `string[]` | `["app"]`                                                                             | Directories to scan recursively for `@ngrok/mantle/*` imports. Paths are relative to the Vite project root.                                                                   |
| `cssFile`   | `string`   | First of `app/global.css`, `src/global.css`, `app/app.css`, `src/app.css` that exists | Path to the CSS file to inject `@source` directives into. Relative to the Vite project root, or absolute.                                                                     |
| `allowlist` | `string[]` | `[]`                                                                                  | Component names to always include regardless of scanner detection. Accepts PascalCase (`"AlertDialog"`) or kebab-case (`"alert-dialog"`). Useful for runtime-only components. |

#### How it works

1. **`configResolved`** — After Vite resolves its configuration, the plugin locates `@ngrok/mantle`'s `dist/` directory by walking up the directory tree from the project root to find `node_modules/@ngrok/mantle` (using the symlink path rather than the pnpm content-addressed realpath, so generated paths stay clean). In dev mode, it also seeds its known-component set from any existing `@source` block so styles are present for all previously-visited routes immediately after a restart. It then walks the directories in `include` scanning every `.ts`, `.tsx`, `.js`, `.jsx`, `.mdx`, and `.md` file for `@ngrok/mantle/<name>` import statements and writes a clearly-marked block of `@source` directives directly into the target CSS file on disk, immediately after the last `@import` line. The write is idempotent — the file is only touched when the content would actually change.

2. **`resolveId`** — The plugin intercepts every `@ngrok/mantle/<name>` import that Vite actually resolves during the session. This is module-graph-aware and catches imports the directory scan misses: components imported from workspace packages outside `include`, and transitive mantle-internal imports (e.g. a component that internally imports another mantle component). In dev mode, newly-seen components trigger a debounced CSS write. In production, the full set is written in `closeBundle`.

3. **`closeBundle`** — At the end of a production build, the plugin writes the precise set of components from the directory scan, `resolveId` intercepts, and `allowlist` — no prior-run knowledge is included, so removing a component from the app will shrink the CSS on the next build. SSR builds are skipped entirely: in SSR double-build setups (e.g. React Router), the server build resolves fewer components than the client build, and writing during it would overwrite the correct client-built set with a reduced one.

4. **`configureServer`** — In development, the plugin also watches your source files via Vite's built-in file watcher. When a file change introduces a mantle import for a component not previously detected, the CSS file is updated in place and Tailwind's own watcher picks up the change automatically — no server restart required.

**Why write to disk:** `@tailwindcss/vite` reads CSS files from disk at dev-server startup to initialize its file-system scanner and set up watchers, before Vite's `transform` pipeline runs. Injecting `@source` via a `transform` hook works in production builds but is invisible to Tailwind's dev-mode scanner. Writing to disk ensures the directives are present when Tailwind first reads the file.

#### The generated block

The plugin writes a deterministic, human-readable block that is safe to commit:

```css
@import "tailwindcss";
@import "@ngrok/mantle/mantle.css";

/* @ngrok/mantle-vite-plugins:source:start */
@source "../node_modules/@ngrok/mantle/dist/button.js";
@source "../node_modules/@ngrok/mantle/dist/button-*.js";
@source "../node_modules/@ngrok/mantle/dist/input.js";
@source "../node_modules/@ngrok/mantle/dist/input-*.js";
/* @ngrok/mantle-vite-plugins:source:end */
```

To remove it, delete the lines between the `source:start` and `source:end` markers, or remove the plugin from your Vite config and it will be cleaned up on the next build.

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
