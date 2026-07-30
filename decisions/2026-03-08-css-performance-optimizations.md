# CSS Performance Optimizations for mantle.css

## Status

- [x] Proposed
- [x] Accepted
- [x] Implemented 2026-03-08
- [ ] Superseded

## Context

A PageSpeed Insights audit of ngrok.com identified `root.css` (the compiled Tailwind v4 output of `mantle.css`) as a render-blocking resource accounting for ~1,040 ms of savings on mobile. The audit also noted ~880+ CSS custom property definitions being parsed unconditionally.

Root causes identified in `mantle.css`:

| Issue                                  | Detail                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `@source "../dist"`                    | Tailwind scanned compiled dist output alongside src, potentially inflating generated utilities                                  |
| Duplicate `--color-gray-*` definitions | Light and dark themes each redeclared 11 gray shades with values identical to `--color-neutral-*`                               |
| Redundant light-theme color overrides  | Light theme redeclared `neutral-50`–`neutral-900` and all 11 `red-*` shades with values identical to Tailwind v4 defaults       |
| Semantic tokens in `@theme {}`         | ~60 self-referencing vars registered Tailwind utility classes (e.g. `bg-background-color-base`) that are never used in practice |

## Decision

Implement three targeted changes to `mantle.css`:

### 1. Make `@source` opt-in via `source-all.css` / `mantleSourcePlugin`

`mantle.css` previously declared both `@source "../src"` and `@source "../dist"`. The published npm package ships only `dist/`, so `@source "../src"` was a dead path for npm consumers, and the only effective source scan was `@source "../dist"`.

In the new setup, `mantle.css` no longer declares any `@source` rules. Instead, consumers opt in to scanning mantle's sources by using either:

- `source-all.css` — a CSS entrypoint that contains `@source "../dist"` pointing at the entire mantle `dist/` directory, or
- `mantleSourcePlugin` — a Vite plugin that programmatically injects targeted `@source` directives for only the components the app actually imports.

The workspace `apps/www/app/global.css` imports `source-all.css` so that local development (including hot module replacement, or HMR, for the docs site) still scans `packages/mantle/src` and `packages/mantle/dist`. The published `mantle.css` is free of `@source` and does not force additional scanning in consumer apps by default.

### 2. Deduplicate `--color-gray-*` in light and dark themes

In the light and dark `:root` blocks, replace the 11 literal `oklch()` gray definitions with `var(--color-neutral-*)` references. These values are always identical to `neutral` in those themes.

High-contrast themes (`light-high-contrast`, `dark-high-contrast`) define distinct gray values. This change leaves them unchanged.

### 3. Remove redundant light-theme color overrides

The light theme `:root` block previously redeclared `--color-neutral-50` through `--color-neutral-900` and all 11 `--color-red-*` shades. Cross-referencing against Tailwind v4's `@theme default {}` (in `tailwindcss/theme.css`) confirmed these values are byte-for-byte identical to the Tailwind defaults — they were overriding the defaults with the same values.

This change removes those 21 definitions. The only neutral shade that remains is `--color-neutral-950` (`oklch(18.2% 0 0)`), which is intentionally lighter than the Tailwind default (`14.5%`).

**Why gray aliases are NOT redundant:** Tailwind v4's default `--color-gray-*` scale has a slight blue-gray chroma (e.g. `oklch(98.5% 0.002 247.839)` for gray-50), while mantle's gray is deliberately pure achromatic (chroma=0, aliased to neutral). The gray aliases remain.

**Dark theme:** the dark theme's color inversions are all necessary — Tailwind does not auto-invert the palette for dark mode.

### 4. Move semantic tokens from `@theme {}` to `@theme inline {}`

The ~60 semantic color tokens (background, border, text, ring, divide) were registered in the main `@theme {}` block using a self-referencing pattern (`--background-color-base: var(--background-color-base)`). This caused Tailwind to generate utility classes like `bg-background-color-base` for all of them. No code in the monorepo uses these generated utilities.

Moving them to `@theme inline {}` keeps the Tailwind token registration (consumers can still reference them via arbitrary values) and stops Tailwind from generating the unused utility classes, which shrinks the compiled CSS output.

Shadow tokens (`--shadow-sm`, `--shadow-md`, etc.) are actively used as utilities and remain in `@theme {}`.

## Alternatives Considered

### Keep `@source "../dist"` in `mantle.css` unconditionally (rejected)

Forces all consumers to scan the entire mantle `dist/` directory, inflating generated CSS. The opt-in approach (`source-all.css` / `mantleSourcePlugin`) gives consumers the choice.

### Keep both `@source "../src"` and `@source "../dist"` in `mantle.css` (previous state)

Works but causes double-scanning in the workspace — Tailwind scans both src and the compiled dist, and the generated CSS is identical (it deduplicates class names). The output size is unchanged; the only cost is slightly longer build/scan time.

### Keep all light-theme color overrides (rejected)

Explicitly declaring values identical to Tailwind defaults pins them against future Tailwind updates. Since this repo pins `tailwindcss` to an exact version, and the Tailwind v4 `@theme default {}` keyword means overrides are explicit opt-ins, the coupling risk is acceptable and the redundancy outweighs the safety benefit.

### Remove semantic tokens from `@theme` entirely

Would stop utility generation entirely. Rejected because it is a potentially breaking API change for consumers who reference these tokens via Tailwind's `theme()` function or as utility class names.

### Replace gray with neutral everywhere (remove gray scale)

Removing `--color-gray-*` from the public API is a breaking change. High-contrast themes also use genuinely different gray values, so gray cannot be a simple alias. Deferred to a future major version.

### Critical CSS inlining / splitting dark and high-contrast CSS into separate `<link>` tags

High-impact but high-effort changes that require the consuming app (www / ngrok.com) to split the CSS load, manage `<link media="...">` tags, and handle SSR hydration. Tracked separately.

## Consequences

### Positive

- The generated CSS is smaller (fewer unused utility classes)
- `mantle.css` no longer forces `@source` scanning on consumers; opt-in via `source-all.css` or `mantleSourcePlugin`
- Workspace HMR still works via `source-all.css` imported in `apps/www/app/global.css`
- Gray color definitions in light/dark themes are DRY and self-documenting
- 21 fewer CSS custom property definitions in the light theme (10 neutral + 11 red shades dropped as Tailwind default duplicates)

### Negative

- Consumers who relied on `bg-background-color-base`-style utility classes (if any exist outside this monorepo) would need to use arbitrary values or CSS variables directly. The audit found no such usage.
- Gray-to-neutral aliasing in light/dark adds one extra `var()` indirection — negligible in practice.

### 5. `@ngrok/mantle-vite-plugins` — targeted `@source` injection

A new standalone npm package, `@ngrok/mantle-vite-plugins`, was created alongside this decision record. It exports `mantleSourcePlugin`, a Vite plugin that reduces the scope of Tailwind's component scanning from the entire mantle `dist/` directory to only the components the consuming app actually imports.

**How it works:**

- **`configResolved`** — After Vite resolves its configuration, the plugin locates `@ngrok/mantle`'s `dist/` directory via `require.resolve`, walks the directories listed in `include` (default: `["src"]`) and scans every `.ts/.tsx/.js/.jsx/.mdx/.md` file for `@ngrok/mantle/<name>` import statements. It then writes a block of targeted `@source "<rel/path/to/dist/<name>.js"` directives directly into the target CSS file on disk (between `MARKER_START` and `MARKER_END` comments), immediately after the last `@import` line. The write is idempotent — the plugin touches the file only when the content would actually change.

- **`configureServer`** — In development, the plugin watches source files via `server.watcher`. When a file change introduces a mantle import for a component not previously detected, the plugin updates the CSS file in place and Tailwind's own file watcher picks up the change — no server restart required.

**Why write to disk:** `@tailwindcss/vite` reads CSS files from disk at dev-server startup to initialize its file-system scanner and set up watchers, before Vite's `transform` pipeline runs. Injecting `@source` via a `transform` hook works for production builds but is invisible to Tailwind's dev-mode scanner. Writing directly to disk puts the directives in the file before Tailwind first reads it.

**`source-all.css` alternative:** For apps that use most or all mantle components, or where build tooling configuration is undesirable, `@import "@ngrok/mantle/source-all.css"` is the zero-configuration option. It adds a single `@source` pointing at the entire `dist/` directory. `apps/www` uses this approach since it imports virtually every component.

**When to use each:**

| Approach             | When to use                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `mantleSourcePlugin` | App uses a subset of mantle components and you want the smallest possible CSS output.            |
| `source-all.css`     | App uses most or all components, or you want zero build tooling configuration (e.g. `apps/www`). |

## Remaining Opportunities (not implemented here)

| Improvement                                                          | Effort | Impact                                              |
| -------------------------------------------------------------------- | ------ | --------------------------------------------------- |
| Critical CSS inlining for ngrok.com homepage                         | High   | Highest — eliminates render-blocking penalty        |
| Split syntax highlight token styles into a separate async stylesheet | Done   | Medium — smaller critical CSS on non-code pages     |
| Resolve `oklch()` values to hex/hsl at build time                    | High   | Low — marginal parse improvement on low-end devices |
| Per-app targeted `@source` via `mantleSourcePlugin`                  | Done   | Medium — smaller CSS for apps using few components  |

### 6. Split dark and high-contrast themes into lazy-loaded `<link>` stylesheets

This change splits `mantle.css` into four files. The light theme (default) remains in `mantle.css` and loads as before. The other three themes move into separate files that load via `<link media="...">` tags, so they are non-render-blocking for users whose OS preference does not match the media query.

| File                             | Content                    | Default `media` attribute                                    |
| -------------------------------- | -------------------------- | ------------------------------------------------------------ |
| `mantle.css`                     | Light theme + all Tailwind | (loaded via `@import` in consuming app CSS — unchanged)      |
| `mantle-dark.css`                | Dark theme vars            | `(prefers-color-scheme: dark)`                               |
| `mantle-light-high-contrast.css` | Light high-contrast vars   | `(prefers-contrast: more) and (prefers-color-scheme: light)` |
| `mantle-dark-high-contrast.css`  | Dark high-contrast vars    | `(prefers-contrast: more) and (prefers-color-scheme: dark)`  |

**`MantleStylesheets` component** (exported from `@ngrok/mantle/theme`) renders the three `<link>` tags. It accepts:

- `forceTheme?: ResolvedTheme` — when set, the component forces the corresponding stylesheet's `media` to `"all"` so it loads unconditionally (useful for dark-only apps like ngrok.com).
- `ssrCookie?: string` — the extracted theme cookie from the incoming HTTP request (via `extractThemeCookie`). When the server resolves a non-system theme from the cookie, it renders the correct `media` attribute directly in the SSR HTML and omits the inline fix script entirely, eliminating FOUC for users with a manual theme override without relying on JavaScript.
- `nonce?: string` — Content Security Policy (CSP) nonce for the inline fix script (see below).

On the client, the component uses a `MutationObserver` on `html[data-applied-theme]` to detect manual theme changes (e.g. light-OS user picks dark) and updates the relevant `<link media>` attribute to `"all"` so the stylesheet becomes active.

**Inline fix script:** The component renders an inline `<script>` after the `<link>` tags. It runs synchronously before first paint, reads `html.dataset.appliedTheme` (already set by `PreventWrongThemeFlashScript`), and corrects any `media` attributes that were rendered with the wrong value. This is a safety net for cases where `ssrCookie` is omitted or the stored theme is `"system"` (which cannot be resolved server-side without OS preference). When `ssrCookie` carries a non-system theme, the SSR HTML is already correct and the inline script is a no-op.

**FOUC analysis:**

| User scenario                                         | Risk | Why                                                                                                                                                                                                            |
| ----------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| System theme = light (majority)                       | None | Dark/HC stylesheets have restrictive media — not applied, not render-blocking                                                                                                                                  |
| System theme = dark                                   | None | Dark stylesheet media matches — browser applies it before paint                                                                                                                                                |
| System theme = high-contrast                          | None | HC stylesheet media matches — applied before paint                                                                                                                                                             |
| Manual theme override + `ssrCookie` set               | None | Server renders `media="all"` for the active theme directly — fix script is omitted                                                                                                                             |
| Manual theme override, no `ssrCookie` (or `"system"`) | None | Inline fix script runs synchronously before paint, reads `html[data-applied-theme]` set by `PreventWrongThemeFlashScript`, and corrects `media` attributes. Dark CSS was already downloaded so no visible FOUC |
| `forceTheme` set (e.g. dark-only app)                 | None | `media="all"` is rendered on SSR — stylesheet is render-blocking as intended                                                                                                                                   |

**Why `mantle.css` stays in the `@import` chain:** Tailwind v4 must see the `@import` to process `@theme {}` blocks and `@custom-variant` rules. The extracted files contain only CSS custom property definitions (no Tailwind directives) and do not need to be in the CSS import chain.

**URL resolution:** The component uses Vite `?url` imports (`import darkCssUrl from "../../mantle-dark.css?url"`). Vite resolves these to browser-accessible fingerprinted URLs in both client and SSR builds. `tsdown` externalizes `?url` imports so they pass through to the consuming app's Vite bundler unchanged.

### 7. Move syntax highlight token styles into the code-block component

This change moves the `.token.*` CSS rules out of `mantle.css` and into `packages/mantle/src/components/code-block/syntax-highlight.css`, which `code-block.tsx` imports directly as a side-effect:

```ts
import "./syntax-highlight.css";
```

Vite bundles this as a CSS chunk associated with the code-block JS module. Apps that never import `@ngrok/mantle/code-block` no longer pay the cost of these styles in their critical CSS. Apps that do import code-block get the styles automatically — no manual import required.

The file is named `syntax-highlight.css` (not `prism.css`) because highlighters share the `.token.*` selector convention and the styles are not Prism-specific.
