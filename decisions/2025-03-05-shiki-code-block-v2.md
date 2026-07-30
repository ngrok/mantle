# ShikiCodeBlock v2 — Build-Time Highlighting, Zero Browser Bundle

## Status

- [x] Proposed
- [x] Accepted
- [ ] Implemented
- [ ] Superseded

## Context

The existing `CodeBlock` component uses PrismJS for syntax highlighting. Prism runs in the browser via `useEffect`, which causes three problems:

1. **PrismJS bundle shipped to every page** — `CodeBlock` loads grammars eagerly for all supported languages
2. **Hydration mismatches** — SSR renders plain escaped text; client swaps in highlighted HTML in a `useEffect`, requiring `suppressHydrationWarning` on the `<code>` element
3. **No clean server rendering** — there is no path to get highlighted HTML on the server without shipping Shiki/Prism to the browser

The goal is a **net-new** `ShikiCodeBlock` component that produces identical highlighted output to Shiki running in the browser, but does all highlighting work at build/HMR time via a Vite plugin. Zero Shiki or Prism runtime in the browser bundle. Works for both MDX docs (static code fences) and pure Vite apps (runtime interpolations). For code that is truly dynamic at request time (e.g. traffic inspector showing API response bodies), a React Router server action does the highlighting.

## Decision

### Three-Path Architecture

```
Path 1: Vite plugin (build time)     Path 2: Rehype plugin (MDX)     Path 3: Server action (runtime)
──────────────────────────────────   ───────────────────────────────  ───────────────────────────────
shikiCode("ts")`...` in .tsx/.jsx    markdown code fences in .mdx     dynamic code from API/user input
         ↓                                      ↓                                  ↓
Vite transform hook runs Shiki        rehypeShikiCodeBlock plugin       shikiHighlightAction (RR action)
MagicString rewrites in-place →       runs Shiki, injects HTML prop     POST { code, language } →
HTML string inlined in module         into compiled MDX JSX →           JSON { html } response
         ↓                                      ↓                                  ↓
Component reads __preHtml,            Component reads from prop          Component fetches on mount,
substitutes SHIKI_VAL_N              (same ShikiCodeValue shape)        renders plain text until done
at render time                                                          (client-side cache by hash)
```

### Core Mechanism: Inline HTML, No Virtual Module, No Runtime Lookup

The Vite plugin inlines pre-rendered HTML directly into each source file as a string literal using MagicString. This gives exact code splitting automatically: a page only loads highlighted HTML for components it actually renders.

```tsx
// What the developer writes:
shikiCode("typescript")`const x = ${someVar};`

// What the plugin produces (in-place rewrite):
{
  __brand: "ShikiCodeValue",
  language: "typescript",
  code: `const x = ${someVar}`,
  __preHtml: `<pre class="shiki"><code>...<span>const</span> x = SHIKI_VAL_0;...</code></pre>`,
  __preVals: [someVar]
}
```

A runtime lookup (`map[hash]`) is not tree-shakeable — dynamic key access defeats static analysis, and a single shared virtual module would load ALL highlighted HTML for the entire app on every page. Inline strings travel with their component into whatever chunk Rollup places it in. The only scenario where a virtual module wins is the identical literal code string appearing in two separate source files (rare; you'd share a component instead).

### Interpolation Support

Placeholder substitution supports runtime values (props, state, async data):

- At build time: the plugin replaces each `${expr}` with `SHIKI_VAL_N` (a stable identifier token that Shiki tokenizes as a unit)
- Shiki pre-renders the static structure with placeholders in place
- At render time: the component replaces each `SHIKI_VAL_N` with `escapeHtml(String(val))`

The token highlighting of the placeholder matches the expected type at that position (e.g., `'SHIKI_VAL_0'` inside string quotes highlights as a string). The actual runtime value inherits that highlighting.

**Limitation**: if a value changes the token type (e.g., injecting a bare identifier where the placeholder was inside quotes), the surrounding highlight span is "wrong". This is acceptable for docs and dashboard usage patterns where values are typically inside string literals, command substitutions, or template expressions.

### `shikiCode("lang")` Tagged Template

The tagged template co-locates the language with the code, so `ShikiCodeBlock.Code` needs no separate `language` prop:

```tsx
// Old CodeBlock (language separate from value):
<CodeBlock.Code language="typescript" value={fmtCode`const x = "hello";`} />

// New ShikiCodeBlock (language in tagged template):
<ShikiCodeBlock.Code value={shikiCode("typescript")`const x = "hello";`} />
```

The `shikiCode("lang")` runtime function is a no-op that returns a `ShikiCodeValue` object with `__preHtml: undefined`. If the Vite plugin is not configured, the component renders plain escaped text and logs a dev warning. No highlighting without the plugin — but no broken rendering either.

### Server Action Path (`highlightHref`)

For truly dynamic content (traffic inspector showing request/response bodies, user-entered code, account-specific configs), `@ngrok/mantle/shiki-server` exports a React Router action handler:

```tsx
// app/routes/api.highlight.ts
import { shikiHighlightAction } from "@ngrok/mantle/shiki-server";
export const action = shikiHighlightAction;

// Usage in component:
<ShikiCodeBlock.Code
	highlightHref="/api/highlight"
	value={{ language: "json", code: responseBody }}
/>;
```

The component renders plain escaped text immediately, fetches the highlighted HTML on mount, and swaps it in. A module-level `Map<hash, html>` cache prevents duplicate requests for the same content. Shiki runs server-side only.

### CSS Theming: Prism → Shiki CSS Variable Mapping

Shiki's `css-variables` theme outputs inline `style="color:var(--shiki-token-keyword)"` on each token span. CSS variables defined in `mantle.css` map to the same mantle design tokens Prism currently uses, so the visual output is identical after migration:

| Shiki CSS var                     | Mantle token         | Was Prism token                        |
| --------------------------------- | -------------------- | -------------------------------------- |
| `--shiki-color-text`              | `--color-gray-900`   | default code text                      |
| `--shiki-token-comment`           | `--color-gray-500`   | `.token.comment`                       |
| `--shiki-token-constant`          | `--color-indigo-600` | `.token.number`, `.token.boolean`      |
| `--shiki-token-string`            | `--color-green-600`  | `.token.string`, `.token.attr-name`    |
| `--shiki-token-string-expression` | `--color-green-600`  | `.token.operator`, `.token.url`        |
| `--shiki-token-keyword`           | `--color-blue-600`   | `.token.keyword`, `.token.selector`    |
| `--shiki-token-function`          | `--color-blue-600`   | `.token.function`, `.token.class-name` |
| `--shiki-token-parameter`         | `--color-yellow-600` | `.token.variable`, `.token.regex`      |

Dark mode uses `-400` palette variants of the same hues. Phase 3 deletes the Prism CSS block (`MARK: PRISM SYNTAX HIGHLIGHT`, lines 1526–1587 of `mantle.css`).

## What Ships

| Export                           | Contents                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| `@ngrok/mantle/shiki-code-block` | `ShikiCodeBlock` compound component + `shikiCode()` tagged template + `ShikiCodeValue` type |
| `@ngrok/mantle/vite-plugin`      | `shikiCodeBlock()` Vite plugin (required for Path 1)                                        |
| `@ngrok/mantle/shiki-server`     | `shikiHighlightAction` React Router action handler (Path 3)                                 |

`shiki` is a `devDependency` of `@ngrok/mantle` — only the Vite plugin (Node.js build process) and the server action ever import it. It is never in the browser bundle.

## Alternatives Considered

### Keep PrismJS client-side

- No build complexity
- Hydration mismatch suppression remains
- Prism bundle stays in browser
- No path to SSR-correct highlighting

### Virtual module per content hash

- True cross-file deduplication for identical code blocks
- More plugin complexity (many virtual modules to track/serve)
- Named exports from one virtual module are tree-shakeable, but only at module granularity
- Not worth the complexity given that duplicate literal code blocks in different source files are rare in practice

### Rehype-only approach for all paths

- Only works for MDX consumers
- Does not address pure Vite app usage (ngrok dashboard)

### RSC / React Flight Protocol

- Would require React Flight support in React Router render
- Premature — React Router 7 SSR + Vite plugin path achieves the same result without RSC
