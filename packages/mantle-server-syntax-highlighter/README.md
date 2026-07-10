# @ngrok/mantle-server-syntax-highlighter

Server-side syntax highlighting for [`@ngrok/mantle`](https://github.com/ngrok/mantle), powered by [Shiki](https://shiki.style).

Use this package to highlight code in API routes, server actions, or any Node.js context where you need Mantle-compatible highlighted HTML without a browser or Vite.

## Requirements

- Node.js 24+
- `@ngrok/mantle` installed in the same project

## Installation

```sh
pnpm add -E @ngrok/mantle-server-syntax-highlighter
```

## Usage

```ts
import { createMantleServerSyntaxHighlighter } from "@ngrok/mantle-server-syntax-highlighter";

const highlighter = createMantleServerSyntaxHighlighter();

const result = await highlighter.highlight({
	code: 'console.log("hello world")',
	language: "typescript",
});

// result.html        — highlighted HTML (inner content, no <code> wrapper)
// result.code        — normalized source code
// result.language    — resolved language
```

## API

### `createMantleServerSyntaxHighlighter()`

Creates a reusable server highlighter instance. This is the recommended entry point — it internally caches the Shiki highlighter and recently highlighted results for performance.

```ts
const highlighter = createMantleServerSyntaxHighlighter();
const result = await highlighter.highlight(input);
```

### `highlightWithMantleShiki(input)`

Lower-level function that highlights code with Mantle's shared Shiki engine and normalization defaults. Use this if you need direct access without the facade object.

```ts
import { highlightWithMantleShiki } from "@ngrok/mantle-server-syntax-highlighter";

const result = await highlightWithMantleShiki({
	code: "const x = 1;",
	language: "typescript",
	showLineNumbers: true,
	highlightLines: [1],
});
```

### `getMantleShikiHighlighter()`

Returns Mantle's shared Shiki highlighter instance (created and cached on first call). Useful if you need the raw Shiki highlighter for advanced use cases.

```ts
import { getMantleShikiHighlighter } from "@ngrok/mantle-server-syntax-highlighter";

const shiki = await getMantleShikiHighlighter();
```

### Input Options

| Option            | Type                             | Default    | Description                                                  |
| ----------------- | -------------------------------- | ---------- | ------------------------------------------------------------ |
| `code`            | `string`                         | (required) | Raw code string to highlight.                                |
| `language`        | `string`                         | (required) | Language hint (e.g. `"typescript"`, `"go"`, `"python"`).     |
| `indentation`     | `"tabs" \| "spaces"`             | auto       | Indentation preference. Defaults to language-inferred value. |
| `showLineNumbers` | `boolean`                        | `false`    | Whether to render line numbers into the returned HTML.       |
| `highlightLines`  | `(number \| [number, number])[]` | `[]`       | Line numbers or ranges to highlight.                         |
| `lineNumberStart` | `number`                         | `1`        | Start line number for rendered line numbers.                 |

### Result

| Field             | Type                             | Description                                           |
| ----------------- | -------------------------------- | ----------------------------------------------------- |
| `html`            | `string`                         | Highlighted HTML (inner content of `<code>` element). |
| `code`            | `string`                         | Normalized source code used as the highlight input.   |
| `language`        | `string`                         | Resolved language used for highlighting.              |
| `showLineNumbers` | `boolean`                        | Whether the HTML includes line numbers.               |
| `highlightLines`  | `(number \| [number, number])[]` | Highlighted line ranges applied to the HTML.          |
| `lineNumberStart` | `number`                         | Start line number used in the HTML.                   |

### Supported Languages

The following Shiki grammar IDs are preloaded:

`bash`, `csharp`, `css`, `go`, `html`, `java`, `javascript`, `json`, `jsx`, `python`, `ruby`, `rust`, `shell`, `tsx`, `typescript`, `xml`, `yaml`

These are exported as `mantleShikiLanguageGrammarIds` for programmatic access.

## TypeScript

Type declarations are included. No `@types/*` package is needed.

## Related Packages

- [`@ngrok/mantle`](https://github.com/ngrok/mantle/tree/main/packages/mantle) — UI component library ([npm](https://www.npmjs.com/package/@ngrok/mantle))
- [`@ngrok/mantle-vite-plugins`](https://github.com/ngrok/mantle/tree/main/packages/mantle-vite-plugins) — Vite + rehype plugins ([npm](https://www.npmjs.com/package/@ngrok/mantle-vite-plugins))
