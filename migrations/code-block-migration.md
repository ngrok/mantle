# Mantle CodeBlock Migration Guide

This document describes how to migrate from PrismJS-powered code blocks to `@ngrok/mantle`'s Shiki-powered CodeBlock component. There are three packages involved:

| Package                                   | Purpose                                                                              | When to install                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------- |
| `@ngrok/mantle`                           | Runtime React components (`CodeBlock.*`, `mantleCode`, `createMantleCodeBlockValue`) | Always                                   |
| `@ngrok/mantle-vite-plugins`              | Vite build-time transforms (tagged templates + MDX fenced code blocks)               | When using Vite                          |
| `@ngrok/mantle-server-syntax-highlighter` | Server-side Shiki highlighting engine                                                | When highlighting on a server at runtime |

Key design principle: **syntax highlighting never runs in the browser**. It happens at build time (Vite plugin), at request time (server highlighter), or not at all (graceful fallback to plain text).

> **Security note:** `preHtml` is rendered via `dangerouslySetInnerHTML`. Only pass HTML produced by Shiki (via the Vite plugin, server highlighter, or highlight server). Never pass unsanitized user input as `preHtml`.

---

## Migrating from PrismJS (Before → After)

If your app currently uses PrismJS (directly or via `react-syntax-highlighter`), here are the patterns you need to find and replace.

### What to search for (old patterns)

Look for these imports and usages in your codebase:

```tsx
// OLD: PrismJS imports (remove these)
import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/themes/prism.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import SyntaxHighlighter from "react-syntax-highlighter";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";

// OLD: PrismJS usage patterns
<SyntaxHighlighter language="typescript">{code}</SyntaxHighlighter>
<SyntaxHighlighter language="typescript" showLineNumbers>{code}</SyntaxHighlighter>

// OLD: manual Prism.highlight calls
const html = Prism.highlight(code, Prism.languages.typescript, "typescript");

// OLD: Legacy mantle CodeBlock with separate language prop
import { CodeBlock, fmtCode } from "@ngrok/mantle/code-block";
<CodeBlock.Code language="typescript" value={fmtCode`const x = 1;`} />

// OLD: useEffect-based highlighting
useEffect(() => {
  Prism.highlightAll();
}, []);
```

### Replacement patterns (new)

```tsx
// NEW: Static code known at build time (Vite plugin transforms this)
import { CodeBlock, mantleCode } from "@ngrok/mantle/code-block";

<CodeBlock.Root>
	<CodeBlock.Body>
		<CodeBlock.CopyButton />
		<CodeBlock.Code value={mantleCode("typescript")`const x = 1;`} />
	</CodeBlock.Body>
</CodeBlock.Root>;

// NEW: Dynamic code (not known at build time, no highlighting)
import { CodeBlock, createMantleCodeBlockValue } from "@ngrok/mantle/code-block";

<CodeBlock.Code value={createMantleCodeBlockValue({ code, language: "typescript" })} />;

// NEW: Dynamic code WITH highlighting (requires server highlighter or sidecar)
// See Use Cases 1 and 3 below for details
```

### Key differences from PrismJS

| PrismJS / react-syntax-highlighter                 | Mantle CodeBlock                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| Highlighting runs in the browser                   | Highlighting runs at build time or on the server, never in browser       |
| Language is a prop on the component                | Language is part of `mantleCode("lang")` or `createMantleCodeBlockValue` |
| Imports grammar files per language                 | No grammar imports needed — Shiki bundles are build/server only          |
| `useEffect` + `Prism.highlightAll()`               | No effect needed — HTML is pre-rendered                                  |
| Ships ~30-100KB+ JS to browser                     | Ships 0KB highlighting JS to browser                                     |
| `suppressHydrationWarning` needed for SSR          | No hydration mismatch — HTML is stable                                   |
| CSS classes like `.token.keyword`, `.token.string` | CSS variables like `--shiki-token-keyword`                               |

### CSS migration

Remove PrismJS theme CSS imports and any custom Prism token styles:

```tsx
// REMOVE these
import "prismjs/themes/prism.css";
import "prismjs/themes/prism-tomorrow.css";
// or any custom .token.keyword { color: ... } styles
```

Mantle's `mantle.css` already includes the Shiki CSS variable theme. Just ensure you import it:

```tsx
import "@ngrok/mantle/mantle.css";
```

### Uninstall old packages

```bash
pnpm remove prismjs react-syntax-highlighter @types/prismjs @types/react-syntax-highlighter
```

---

## Use Case 1: React 19 + Vite + Node Server (e.g. React Router 7 / Express)

This is the most common setup. You have a Vite-built React app served by a Node.js server (React Router 7, Express, Fastify, etc.). You want:

- Build-time highlighting for static code in components (via `mantleCode` tagged templates)
- Server-side highlighting for dynamic code (via an API route using `@ngrok/mantle-server-syntax-highlighter`)
- MDX fenced code block highlighting (if you use MDX)

### 1. Install dependencies

```bash
# runtime
pnpm add -E @ngrok/mantle

# build-time (Vite plugin for mantleCode tagged templates + MDX rehype plugin)
pnpm add -DE @ngrok/mantle-vite-plugins

# server-side (for dynamic/user-provided code highlighting at request time)
pnpm add -E @ngrok/mantle-server-syntax-highlighter
```

### 2. Configure Vite

```ts
// vite.config.ts
import { mantleCodeBlockPlugins } from "@ngrok/mantle-vite-plugins";
import { defineConfig } from "vite";

const codeBlockPlugins = mantleCodeBlockPlugins();

export default defineConfig({
	plugins: [
		// Vite plugin: transforms mantleCode("lang")`...` tagged templates at build time
		...codeBlockPlugins.vitePlugins,

		// If using MDX, add the rehype plugin to your MDX config:
		// mdx({
		//   rehypePlugins: [...codeBlockPlugins.rehypePlugins],
		// }),
	],
});
```

#### Plugin options

`mantleCodeBlockPlugins()` accepts an options object:

```ts
mantleCodeBlockPlugins({
	runtime: true, // (default true) enables mantleCode`` tagged template transforms
	mdx: true, // (default true) enables MDX fenced code block rehype plugin
});
```

If you don't use MDX, you can disable it: `mantleCodeBlockPlugins({ mdx: false })`.
If you only use MDX and not tagged templates: `mantleCodeBlockPlugins({ runtime: false })`.

### 3. Use CodeBlock in components (build-time highlighting)

```tsx
import { CodeBlock, mantleCode } from "@ngrok/mantle/code-block";

function MyComponent() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.Title>example.ts</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("typescript")`
            const greeting = "Hello, world!";
            console.log(greeting);
          `}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}
```

The Vite plugin rewrites `mantleCode("typescript")\`...\``at build time, injecting pre-rendered Shiki HTML into the`~preHtml` property. No Shiki code ships to the browser.

#### mantleCode options

```ts
mantleCode("typescript", {
	showLineNumbers: true,
	highlightLines: [1, "3-5"],
	lineNumberStart: 10,
	indentation: "spaces", // or "tabs" — overrides language default
})`const x = 1;`;
```

#### Indentation defaults

Languages have default indentation styles. Tab-indented by default: `csharp`, `css`, `go`, `html`, `java`, `javascript`, `js`, `jsx`, `typescript`, `ts`, `tsx`, `xml`. All other languages default to spaces unless overridden. Use the `indentation` option to override.

#### Interpolation

```tsx
mantleCode("typescript")`const name = "${userName}";`;
```

Interpolated values are replaced at runtime via placeholder substitution. The Vite plugin highlights the template with placeholders, and the component swaps in real values at render time. The copy button copies the plain-text version with real values.

**Limitation:** If an interpolated value changes the token type at that position (e.g., injecting a bare identifier where the placeholder sits inside string quotes), the syntax highlighting color of the surrounding span may be incorrect. This is acceptable for typical usage where interpolated values appear inside strings, template expressions, or command substitutions.

### 4. Server-side highlighting for dynamic code

For code that isn't known at build time (user input, API responses, database content), use the server syntax highlighter in an API route or server action.

```ts
// app/routes/api.shiki-highlight.ts (React Router 7 example)
import { createMantleServerSyntaxHighlighter } from "@ngrok/mantle-server-syntax-highlighter";

const highlighter = createMantleServerSyntaxHighlighter();

export async function action({ request }: { request: Request }) {
	const { code, language } = await request.json();

	const result = await highlighter.highlight({
		code,
		language,
		// optional:
		// showLineNumbers: true,
		// highlightLines: [1, "3-5"],
		// lineNumberStart: 1,
	});

	return Response.json({
		code: result.code,
		html: result.html,
		language: result.language,
		highlightLines: result.highlightLines,
		lineNumberStart: result.lineNumberStart,
		showLineNumbers: result.showLineNumbers,
	});
}
```

Then on the client, fetch from the API and construct a `MantleCodeBlockValue`:

```tsx
import {
	CodeBlock,
	createMantleCodeBlockValue,
	parseCodeBlockHighlightLines,
	parseLanguage,
} from "@ngrok/mantle/code-block";

// After fetching from your highlight API:
const value = createMantleCodeBlockValue({
	code: data.code,
	language: parseLanguage(data.language),
	preHtml: data.html,
	showLineNumbers: data.showLineNumbers,
	highlightLines: parseCodeBlockHighlightLines(data.highlightLines) ?? [],
	lineNumberStart: data.lineNumberStart,
});

// Render it:
<CodeBlock.Root>
	<CodeBlock.Body>
		<CodeBlock.CopyButton />
		<CodeBlock.Code value={value} />
	</CodeBlock.Body>
</CodeBlock.Root>;
```

### 5. MDX fenced code blocks (if using MDX)

If you use MDX, fenced code blocks are automatically highlighted at build time via the rehype plugin. You need to map the `<pre>` element to a CodeBlock component in your MDX provider:

```tsx
// components/mdx-provider.tsx
import {
	CodeBlock,
	createMantleCodeBlockValue,
	resolvePreRenderedCodeBlockProps,
	type CodeBlockPreElementInput,
} from "@ngrok/mantle/code-block";
import { MDXProvider } from "@mdx-js/react";

const components = {
	pre: (props: ComponentProps<"pre"> & CodeBlockPreElementInput) => {
		const { children, className, ...rawProps } = props;
		const { mantleCode: preRendered, props: rest } = resolvePreRenderedCodeBlockProps(rawProps);

		// Fallback to plain <pre> if not a mantle-highlighted code block
		if (!preRendered) {
			return (
				<pre className={className} {...rest}>
					{children}
				</pre>
			);
		}

		const { code, language, preHtml } = preRendered;
		if (!code || !language || !preHtml) {
			return (
				<pre className={className} {...rest}>
					{children}
				</pre>
			);
		}

		const value = createMantleCodeBlockValue({
			language,
			code,
			preHtml,
			highlightLines: preRendered.highlightLines,
			lineNumberStart: preRendered.lineNumberStart,
			showLineNumbers: preRendered.showLineNumbers ?? true,
		});

		return (
			<CodeBlock.Root>
				{preRendered.title && (
					<CodeBlock.Header>
						{preRendered.mode && <CodeBlock.Icon preset={preRendered.mode} />}
						<CodeBlock.Title>{preRendered.title}</CodeBlock.Title>
					</CodeBlock.Header>
				)}
				<CodeBlock.Body>
					<CodeBlock.CopyButton />
					<CodeBlock.Code value={value} />
				</CodeBlock.Body>
			</CodeBlock.Root>
		);
	},
};

export function MdxProvider({ children }) {
	return <MDXProvider components={components}>{children}</MDXProvider>;
}
```

MDX fenced code blocks support metadata in the opening fence:

````markdown
```tsx title="example.tsx" mode=file showLineNumbers highlight="2-3"
const x = 1;
const y = 2;
const z = x + y;
```
````

Supported meta keys: `title`, `mode` (`cli` | `file` | `traffic-policy`), `showLineNumbers`, `highlight` / `highlightLines`, `lineNumberStart`, `collapsible`, `disableCopy`.

Full example with all meta keys:

````markdown
```tsx title="example.tsx" mode=file showLineNumbers highlight="2-4" lineNumberStart=10 collapsible disableCopy
const x = 1;
const y = 2;
const z = x + y;
```
````

---

## Use Case 2: React 19 + Vite + MDX Static Content

This is for static sites or documentation sites where all code is known at build time in MDX files. No server-side highlighting is needed.

### 1. Install dependencies

```bash
# runtime
pnpm add -E @ngrok/mantle

# build-time (Vite plugin + MDX rehype plugin)
pnpm add -DE @ngrok/mantle-vite-plugins
```

You do NOT need `@ngrok/mantle-server-syntax-highlighter` because all code is static and highlighted at build time.

### 2. Configure Vite

```ts
// vite.config.ts
import mdx from "@mdx-js/rollup";
import { mantleCodeBlockPlugins } from "@ngrok/mantle-vite-plugins";
import { defineConfig } from "vite";

const codeBlockPlugins = mantleCodeBlockPlugins();

export default defineConfig({
	plugins: [
		// Vite plugin for mantleCode`` tagged templates
		...codeBlockPlugins.vitePlugins,

		// MDX with the rehype plugin for fenced code block highlighting
		mdx({
			rehypePlugins: [...codeBlockPlugins.rehypePlugins],
		}),
	],
});
```

### 3. Write MDX with fenced code blocks

````markdown
# Getting Started

Install the package:

```bash mode=cli title="Command Line"
npm install @ngrok/mantle
```

Then use it:

```tsx title="app.tsx" highlight="3"
import { Button } from "@ngrok/mantle/button";

function App() {
	return <Button>Click me</Button>;
}
```
````

All fenced code blocks are pre-rendered to HTML at build time. No Shiki ships to the browser.

### 4. Set up the MDX provider

Same as Use Case 1, Step 5. Map `<pre>` to `CodeBlock` in your MDX provider using `resolvePreRenderedCodeBlockProps`.

### 5. Use mantleCode in React components (optional)

If you also have code blocks in React components (not MDX), use `mantleCode` tagged templates exactly as shown in Use Case 1, Step 3. The Vite plugin handles both MDX and tagged templates.

### What you DON'T need

- No `@ngrok/mantle-server-syntax-highlighter` — all highlighting is build-time
- No API routes for highlighting
- No `createMantleCodeBlockValue` unless you're composing values manually in React components

---

## Use Case 3: React 18 + Vite + Go Server

This is for apps where the frontend is a Vite-built React 18 SPA and the backend is a Go server. The Go server cannot run Shiki (it's JavaScript/Wasm), so you have two options for dynamic code:

**Option A:** Use `mantleCode` tagged templates for all static code (build-time, via Vite plugin) and skip server highlighting entirely. Code not known at build time renders as plain text (no syntax highlighting).

**Option B:** Run a sidecar Node.js highlighting service that the frontend calls directly for dynamic code, using `@ngrok/mantle-server-syntax-highlighter` to produce highlighted HTML.

### 1. Install dependencies

```bash
# runtime
pnpm add -E @ngrok/mantle

# build-time (Vite plugin for mantleCode tagged templates)
pnpm add -DE @ngrok/mantle-vite-plugins
```

### 2. Configure Vite

```ts
// vite.config.ts
import { mantleCodeBlockPlugins } from "@ngrok/mantle-vite-plugins";
import { defineConfig } from "vite";

const codeBlockPlugins = mantleCodeBlockPlugins({
	mdx: false, // disable MDX plugin if you don't use MDX
});

export default defineConfig({
	plugins: [...codeBlockPlugins.vitePlugins],
});
```

### 3. Use CodeBlock in components (build-time highlighting)

Exactly the same as Use Case 1, Step 3. `mantleCode` tagged templates are transformed at Vite build time — the Go server is not involved.

```tsx
import { CodeBlock, mantleCode } from "@ngrok/mantle/code-block";

function TrafficPolicyExample() {
	return (
		<CodeBlock.Root>
			<CodeBlock.Header>
				<CodeBlock.Icon preset="traffic-policy" />
				<CodeBlock.Title>traffic-policy.yaml</CodeBlock.Title>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code
					value={mantleCode("yaml")`
            on_http_request:
              actions:
                type: custom-response
                config:
                  status_code: 200
                  content: Hello, World!
          `}
				/>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}
```

### 4. Dynamic code highlighting (Option A: plain text fallback)

If `~preHtml` is not provided, CodeBlock gracefully falls back to rendering the code as escaped plain text (no colors, but still functional with copy button, line numbers, etc.).

```tsx
import { CodeBlock, createMantleCodeBlockValue } from "@ngrok/mantle/code-block";

function DynamicCodeBlock({ code, language }: { code: string; language: string }) {
	const value = createMantleCodeBlockValue({
		code,
		language,
		// preHtml is omitted — renders as plain text
	});

	return (
		<CodeBlock.Root>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code value={value} />
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}
```

### 4. Dynamic code highlighting (Option B: sidecar highlight service)

Run a small Node.js sidecar alongside your Go server that uses `@ngrok/mantle-server-syntax-highlighter` to highlight code on demand. A minimal service should expose an HTTP endpoint like the following:

```bash
curl -X POST http://127.0.0.1:4444/ \
  -H 'content-type: application/json' \
  -d '{
    "code": "const sum = (a, b) => a + b;",
    "language": "typescript",
    "showLineNumbers": true
  }'
```

Response:

```json
{
	"code": "const sum = (a, b) => a + b;",
	"highlightLines": [],
	"html": "<span class=\"mantle-code-line\">...</span>",
	"language": "typescript",
	"lineNumberStart": 1,
	"showLineNumbers": true
}
```

Then fetch from the frontend and construct a `MantleCodeBlockValue`:

```tsx
import {
	CodeBlock,
	createMantleCodeBlockValue,
	parseCodeBlockHighlightLines,
	parseLanguage,
} from "@ngrok/mantle/code-block";

async function fetchHighlightedCode(code: string, language: string) {
	const response = await fetch("http://localhost:4444/", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ code, language, showLineNumbers: true }),
	});
	return response.json();
}

function DynamicCodeBlock({ code, language }: { code: string; language: string }) {
	const [value, setValue] = useState(null);

	useEffect(() => {
		fetchHighlightedCode(code, language).then((data) => {
			setValue(
				createMantleCodeBlockValue({
					code: data.code,
					language: parseLanguage(data.language),
					preHtml: data.html,
					showLineNumbers: data.showLineNumbers,
					highlightLines: parseCodeBlockHighlightLines(data.highlightLines) ?? [],
					lineNumberStart: data.lineNumberStart,
				}),
			);
		});
	}, [code, language]);

	if (!value) {
		// Render plain text while loading
		return (
			<CodeBlock.Root>
				<CodeBlock.Body>
					<CodeBlock.Code value={createMantleCodeBlockValue({ code, language })} />
				</CodeBlock.Body>
			</CodeBlock.Root>
		);
	}

	return (
		<CodeBlock.Root>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.Code value={value} />
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}
```

### React 18 compatibility note

`@ngrok/mantle` supports React 18. The CodeBlock component uses `"use client"` directives, `useId()`, and standard hooks — all available in React 18. No React 19 features are required.

---

## Component Reference

### Compound Component Structure

```tsx
<CodeBlock.Root>
	{/* Container — manages context, applies base styles */}
	<CodeBlock.Header>
		{/* Optional — header bar with icon and title */}
		<CodeBlock.Icon /> {/* preset="file" | "cli" | "traffic-policy", or svg={<CustomIcon />} */}
		<CodeBlock.Title /> {/* Renders <h3> by default, supports asChild */}
		<CodeBlock.TabList>
			{/* Optional — pill-styled tabs in header (Radix-based) */}
			<CodeBlock.TabTrigger value="example-tab" /> {/* Individual tab trigger */}
		</CodeBlock.TabList>
	</CodeBlock.Header>
	<CodeBlock.Body>
		{/* Content wrapper — positions CopyButton */}
		<CodeBlock.CopyButton /> {/* Copy-to-clipboard with "Copied" feedback */}
		<CodeBlock.Code /> {/* Renders <pre><code> with highlighted HTML */}
		<CodeBlock.TabContent value="..." /> {/* Conditional content for each tab */}
	</CodeBlock.Body>
	<CodeBlock.ExpanderButton /> {/* Optional — "Show more" / "Show less" toggle */}
</CodeBlock.Root>
```

### Tabbed Code Blocks

Use tabs when showing the same concept in multiple languages:

```tsx
import { CodeBlock, mantleCode } from "@ngrok/mantle/code-block";

function MultiLanguageExample() {
	return (
		<CodeBlock.Root defaultTab="typescript">
			<CodeBlock.Header>
				<CodeBlock.Icon preset="file" />
				<CodeBlock.TabList>
					<CodeBlock.TabTrigger value="typescript">TypeScript</CodeBlock.TabTrigger>
					<CodeBlock.TabTrigger value="python">Python</CodeBlock.TabTrigger>
				</CodeBlock.TabList>
			</CodeBlock.Header>
			<CodeBlock.Body>
				<CodeBlock.CopyButton />
				<CodeBlock.TabContent value="typescript">
					<CodeBlock.Code value={mantleCode("typescript")`const greeting = "Hello, world!";`} />
				</CodeBlock.TabContent>
				<CodeBlock.TabContent value="python">
					<CodeBlock.Code value={mantleCode("python")`greeting = "Hello, world!"`} />
				</CodeBlock.TabContent>
			</CodeBlock.Body>
		</CodeBlock.Root>
	);
}
```

For controlled tabs, use `activeTab` and `onActiveTabChange` instead of `defaultTab`.

### Collapsible Code Blocks

Use `ExpanderButton` for long code blocks. The collapsed height is approximately 4 lines (~13.6rem):

```tsx
<CodeBlock.Root>
	<CodeBlock.Body>
		<CodeBlock.CopyButton />
		<CodeBlock.Code
			value={mantleCode("typescript")`
			// ... many lines of code ...
		`}
		/>
	</CodeBlock.Body>
	<CodeBlock.ExpanderButton />
</CodeBlock.Root>
```

In MDX, use the `collapsible` meta key:

````markdown
```typescript collapsible
// Long code block that will be collapsed by default
```
````

### Supported Languages (28)

`bash`, `cs`, `csharp`, `css`, `go`, `html`, `java`, `javascript`, `js`, `json`, `jsx`, `plain`, `plaintext`, `py`, `python`, `rb`, `ruby`, `rust`, `sh`, `shell`, `text`, `ts`, `tsx`, `txt`, `typescript`, `xml`, `yaml`, `yml`

Many are aliases: `js`↔`javascript`, `ts`↔`typescript`, `py`↔`python`, `rb`↔`ruby`, `sh`↔`bash`↔`shell`, `cs`↔`csharp`, `yml`↔`yaml`, `plain`↔`plaintext`↔`text`↔`txt`. Unsupported languages fall back to `"text"` (plain text, no highlighting).

### Key Imports

```tsx
// Components and factories
import {
	CodeBlock,
	mantleCode,
	createMantleCodeBlockValue,
	type MantleCodeBlockValue,
} from "@ngrok/mantle/code-block";

// Utilities (for MDX provider integration)
import {
	resolvePreRenderedCodeBlockProps,
	type CodeBlockPreElementInput,
} from "@ngrok/mantle/code-block";

// Parsing helpers
import {
	parseLanguage,
	isSupportedLanguage,
	parseCodeBlockHighlightLines,
	parseCodeBlockLineNumberStart,
	parseCodeBlockShowLineNumbers,
	supportedLanguages,
} from "@ngrok/mantle/code-block";

// React-free utilities (safe for server-only code, no React dependency)
import { decorateHighlightedHtml, escapeHtml } from "@ngrok/mantle/highlight-utils";

// Vite plugins
import { mantleCodeBlockPlugins } from "@ngrok/mantle-vite-plugins";

// Server highlighter
import { createMantleServerSyntaxHighlighter } from "@ngrok/mantle-server-syntax-highlighter";
```

### Highlight Server API

The sidecar highlight server accepts `POST /` with:

| Field             | Type                 | Required | Description               |
| ----------------- | -------------------- | -------- | ------------------------- |
| `code`            | `string`             | Yes      | Source code to highlight  |
| `language`        | `string`             | Yes      | Language identifier       |
| `showLineNumbers` | `boolean`            | No       | Show line numbers         |
| `highlightLines`  | `string \| number[]` | No       | Lines/ranges to highlight |
| `lineNumberStart` | `number`             | No       | Starting line number      |

Responds with `{ code, html, language, highlightLines, lineNumberStart, showLineNumbers }`.

Health check: `GET /health` returns `200 {"status":"ok"}` when ready, `503 {"status":"starting"}` during Shiki preload.

### CSS / Theming

CodeBlock uses Mantle's built-in CSS variable theme (`mantle-css-variables`). Ensure your app imports the Mantle CSS:

```ts
import "@ngrok/mantle/mantle.css";
```

Light/dark mode is handled automatically via the Mantle `ThemeProvider`. The highlighted HTML uses CSS variable class names that respond to the active theme.

---

## Troubleshooting & Gotchas

### `mantleCode` returns plain text (no syntax highlighting)

The Vite plugin is not configured. `mantleCode` is a no-op at runtime — it requires the Vite plugin to transform tagged templates at build time. Ensure `mantleCodeBlockPlugins().vitePlugins` is in your Vite config. In development, you may see a warning in the console.

### Unsupported language silently falls back to plain text

If you pass a language string that isn't in the supported list, `parseLanguage` returns `"text"` (no highlighting, no error). Check `isSupportedLanguage(lang)` if you need to detect this.

### Highlight line `0` is silently ignored

Line numbers are 1-based. Passing `0` in `highlightLines` (e.g., `[0, 3]`) silently filters it out. Ranges like `"0-3"` are also filtered.

### `preHtml` must come from a trusted source

`preHtml` is rendered via `dangerouslySetInnerHTML`. Only pass HTML produced by Shiki through the Vite plugin, `createMantleServerSyntaxHighlighter`, or the highlight server. Never pass user-provided HTML strings.

### Tab width is hardcoded to 2 spaces

The `<pre>` element renders with `tab-size: 2`. This is not configurable via props or options.

### Title whitespace is trimmed

The `title` meta key value is trimmed — leading/trailing whitespace is removed.

### CodeBlock works without CopyButton, Header, or ExpanderButton

All sub-components besides `Root`, `Body`, and `Code` are optional. A minimal code block is:

```tsx
<CodeBlock.Root>
	<CodeBlock.Body>
		<CodeBlock.Code value={mantleCode("typescript")`const x = 1;`} />
	</CodeBlock.Body>
</CodeBlock.Root>
```
