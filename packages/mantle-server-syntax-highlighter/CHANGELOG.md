# @ngrok/mantle-server-syntax-highlighter

## 1.1.8

### Patch Changes

- [#1345](https://github.com/ngrok/mantle/pull/1345) [`685e5f5`](https://github.com/ngrok/mantle/commit/685e5f50770f68669bf4a39b0d883bc9e7e603fe) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump the `oxc-parser` runtime dependency to 0.141.0.

## 1.1.7

### Patch Changes

- [#1288](https://github.com/ngrok/mantle/pull/1288) [`9d988f2`](https://github.com/ngrok/mantle/commit/9d988f203ddd4a7a433871478adfa1fd4e21af34) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump runtime dependencies: `shiki` to 4.3.1 and `oxc-parser` to 0.139.0.

## 1.1.6

### Patch Changes

- [#1306](https://github.com/ngrok/mantle/pull/1306) [`2e589b4`](https://github.com/ngrok/mantle/commit/2e589b4220910d01a2406e3a4a40d97247e3b0f3) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - fix: publish a lean package.json — prune custom export conditions and slim the manifest

  The `@ngrok/src-live-types` custom export condition only exists so workspace apps can resolve live source files during local development, but it was shipping in the published `package.json#exports` and pointing npm consumers at `./src/...` paths that are excluded from the tarball. A new `prepack`/`postpack` lifecycle pair now rewrites the manifest while the tarball is created and restores the pristine `package.json` afterwards:

  - strips all custom (`@`-namespaced) export conditions
  - collapses `{ types, import }` export entries to plain string targets (TypeScript resolves the sibling `.d.ts` automatically)
  - drops `import` conditions that duplicate `default` (the CSS entries)
  - removes `devDependencies` and `scripts`, which consumers never install or run

  Published packages now expose only standard conditions pointing at `dist`, and each release permanently adds roughly half as much metadata to the npm packument.

## 1.1.5

### Patch Changes

- [#1262](https://github.com/ngrok/mantle/pull/1262) [`9fb7022`](https://github.com/ngrok/mantle/commit/9fb7022ab10e8cad05bd656bd1a518c4d1e1f7b4) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump `oxc-parser` to `0.137.0`.

## 1.1.4

### Patch Changes

- [#1241](https://github.com/ngrok/mantle/pull/1241) [`f7be346`](https://github.com/ngrok/mantle/commit/f7be3464e3d823d8d8e8c1c96ba15b615871ddb7) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update the `oxc-parser` dependency to `0.136.0` (from `0.135.0`).

## 1.1.3

### Patch Changes

- [#1223](https://github.com/ngrok/mantle/pull/1223) [`6dc792c`](https://github.com/ngrok/mantle/commit/6dc792c0f2f91f4f2b34f5ef5ccc4f5a06b2c1b5) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update `shiki` to 4.2.0.

## 1.1.2

### Patch Changes

- [#1207](https://github.com/ngrok/mantle/pull/1207) [`b9fadca`](https://github.com/ngrok/mantle/commit/b9fadca2c3e8ba923ece71578af197aca4220162) Thanks [@dependabot](https://github.com/apps/dependabot)! - Lint cleanup round. No behavior changes.

  Replaced the forbidden inline `typeof import("oxc-parser")` annotations with a type-only namespace import (`import type * as OxcParserModule from "oxc-parser"; type OxcParser = typeof OxcParserModule;`). The lazy `createRequire` loading path is unaffected — `import type * as` is fully erased at compile time.

## 1.1.1

### Patch Changes

- [#1197](https://github.com/ngrok/mantle/pull/1197) [`c30e470`](https://github.com/ngrok/mantle/commit/c30e4707bb8d12ae80e59c8f89e87920a2d0d478) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump `oxc-parser` to `0.130.0`.

## 1.1.0

### Minor Changes

- [#1174](https://github.com/ngrok/mantle/pull/1174) [`51a0864`](https://github.com/ngrok/mantle/commit/51a086436804f6c4f576b9021e0e3ab7699e8907) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Extend code-block folding toward VS Code parity by switching the JS/TS/JSX/TSX, HTML, XML, and CSS strategies to AST / parser-quality matchers, and adding keyword-pair folding for Bash / Shell / Ruby. The runtime click handler is unchanged — all heavier work runs server- or build-side inside `@ngrok/mantle-server-syntax-highlighter`.

  What now folds (per language):
  - **JS / TS / JSX / TSX** (`oxc-parser`) — block statements, object/array literals, class/interface/type-literal/enum bodies, switch statements, multi-line template literals (including tagged), JSX elements (`<Foo>…</Foo>`), JSX fragments (`<>…</>`), member-expression element names (`<obj.Foo>`), and multi-line self-closing opening tags / attribute lists. Single-line self-closing JSX tags still don't get a toggle.
  - **HTML / XML** (`parse5` with `sourceCodeLocationInfo`) — multi-line elements (`<div>…</div>`), nested element folds, multi-line opening tags (the attribute list collapses into the tag name), and full HTML documents with explicit `<html>`/`<head>`/`<body>`. XML routes through parse5's SVG fragment context for foreign-content (XML-like) tokenizer rules so `<empty/>` is correctly self-closing.
  - **CSS** — single-pass CSS-aware brace matcher (skips `/* … */` comments, `"…"` and `'…'` strings, and backslash escapes) replacing the previous token-based bracket walk.
  - **Bash / Shell** — keyword pairs from VS Code's `shellscript` grammar: `if … fi`, `case … esac`, `for|while|until|select … do … done`, brace-form function bodies. Folds the leading-`}` brace-group close while ignoring `${VAR}` parameter expansions (which never lead a line).
  - **Ruby** — combines the bracket pass with keyword pairs from VS Code's `ruby` grammar: `def`, `class`, `module`, `begin`, `if`, `unless`, `while`, `until`, `for`, `case`, and `do |args|` blocks, all closing on `end`. Mid-block keywords (`else`, `rescue`, `when`) deliberately don't pop, so `begin … rescue … end` is a single fold.

  New exports on `@ngrok/mantle-server-syntax-highlighter`:
  - `computeServerFoldRanges({ code, language, tokens })` — main dispatcher, called by `highlightWithMantleShiki`.
  - `serverFoldStrategyFor(language)` / `serverFoldNeedsTokens(strategy)` — let callers control whether to capture Shiki's `includeExplanation: 'scopeName'` tokens.
  - `computeJsxFoldRanges`, `computeHtmlFoldRanges`, `computeCssFoldRanges`, `computeKeywordFoldRanges` — per-strategy computers, individually testable.

  `@ngrok/mantle/highlight-utils` and `@ngrok/mantle/code-block` now also re-export `finalizeFoldRanges` so consumers building custom strategies can reuse the dedup pass.

  Skipping `includeExplanation` on the AST and raw-source paths (JS/TS/HTML/CSS/JSON) keeps the highlight pipeline cheaper than the previous token-only approach for those languages.

- [#1174](https://github.com/ngrok/mantle/pull/1174) [`51a0864`](https://github.com/ngrok/mantle/commit/51a086436804f6c4f576b9021e0e3ab7699e8907) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Extend fold gutters to every supported language, not just JSON. Each language uses the folding model that fits its grammar:
  - **AST-based** (`javascript`, `typescript`, `jsx`, `tsx`) — `oxc-parser` emits folds for blocks, object/array literals, JSX elements/fragments, multi-line template literals, and TypeScript-only bodies.
  - **Raw-source** (`json`, `css`) — single-pass matchers fold braces/brackets while skipping strings, comments, and escapes without requiring Shiki scope explanations.
  - **Bracket-paired** (`go`, `java`, `csharp`, `rust`) — multi-line `{ … }` and `[ … ]` ranges fold via TextMate-scope-aware token walking.
  - **Indentation-based** (`python`, `yaml`) — blocks are detected by leading whitespace; the opener (e.g. `def`, `class`, a YAML key) stays visible and child lines collapse.
  - **AST-based** (`html`, `xml`) — `parse5` source locations fold multi-line elements and opening tags while honoring self-closing XML tags and HTML void elements.
  - **Keyword-paired** (`bash`, `shell`, `sh`) — shell blocks fold from VS Code-style keyword pairs (`if … fi`, `case … esac`, `do … done`) plus brace-form function bodies.
  - **Bracket + keyword** (`ruby`) — Ruby combines brace/array folds with keyword blocks such as `def`, `class`, `module`, `begin`, `do`, `if`, and `case`, all closing on `end`.
  - **No folding** (plain text) — text-like languages have no block model to fold.

  New helper exports from `@ngrok/mantle/code-block` and `@ngrok/mantle/highlight-utils`:
  - `computeFoldRanges({ language, tokens })` — generic fold-range computer that dispatches to the right strategy. Consumes Shiki tokens with `includeExplanation: 'scopeName'`.
  - `foldStrategyFor(language)` — returns `'bracket' | 'indentation' | 'tag' | 'none'` for a supported language.
  - Types: `ComputeFoldRangesInput`, `FoldStrategy`, `FoldLine`, `FoldToken`, `FoldExplanation`, `FoldScope`.

  `computeFoldRanges` is a low-level token helper for custom integrations; the Vite plugin, MDX code fences, and server highlighter use the richer `@ngrok/mantle-server-syntax-highlighter` dispatcher for AST, raw-source, and keyword folding.

  The existing `computeJsonFoldRanges` continues to work for callers that already use it on raw JSON source.

  Also fixes a latent bug where toggling `CodeBlock.ExpanderButton` would replace the highlighted `<code>`'s child DOM (because `dangerouslySetInnerHTML` received a fresh `{ __html }` object on every parent re-render). The replacement was invisible for plain code blocks but silently broke fold toggles, since the runtime's per-`<code>` geometry cache then pointed at detached line elements. The prop is now memoized so child DOM identity survives unrelated re-renders, and the fold runtime additionally validates that cached lines are still connected before reusing them.

### Patch Changes

- [#1174](https://github.com/ngrok/mantle/pull/1174) [`51a0864`](https://github.com/ngrok/mantle/commit/51a086436804f6c4f576b9021e0e3ab7699e8907) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add VS Code-style fold gutters to JSON code blocks. Every multi-line `{ … }` or `[ … ]` now renders a semantic `<button>` toggle in the gutter; clicking (or focusing and pressing `Enter` / `Space`) hides the inner content while keeping the opener and closer lines visible, with a `⋯` placeholder marking the collapsed region.
  - Fold ranges are computed at build time, so there is zero highlighting cost in the browser.
  - All toggle interaction runs through a single delegated click handler per `<pre>` — no per-line listeners and no React re-renders. This keeps fold/unfold cheap even on JSON blobs with thousands of lines.
  - New helper exports from `@ngrok/mantle/code-block` and `@ngrok/mantle/highlight-utils`: `computeJsonFoldRanges(code)` and the `FoldableRange` type.
  - `decorateHighlightedHtml` accepts a new optional `foldableRanges` input. When omitted, the decorator behaves exactly as before — no fold gutter is rendered.
  - Server-highlighted code blocks can provide fold ranges for every supported language with a folding strategy; raw JSON callers can continue using `computeJsonFoldRanges(code)` directly.

## 1.0.4

### Patch Changes

- [#1119](https://github.com/ngrok/mantle/pull/1119) [`0c20cf7`](https://github.com/ngrok/mantle/commit/0c20cf736429dd6e0085d4f38affce86f7de8ee9) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Default `showLineNumbers` to `true` in `mantleCode()` and `highlightWithMantleShiki()` so code blocks show line numbers by default. Single-line shell snippets (`bash`, `sh`, `shell`) default to `false` since line numbers add noise to one-liners like install commands.

- Updated dependencies [[`0c20cf7`](https://github.com/ngrok/mantle/commit/0c20cf736429dd6e0085d4f38affce86f7de8ee9)]:
  - @ngrok/mantle@0.68.3

## 1.0.3

### Patch Changes

- [#1115](https://github.com/ngrok/mantle/pull/1115) [`ea340f6`](https://github.com/ngrok/mantle/commit/ea340f6307f3f0f229395783c0c21f7a35363688) Thanks [@dependabot](https://github.com/apps/dependabot)! - bump shiki from 4.0.1 to 4.0.2

- [#1116](https://github.com/ngrok/mantle/pull/1116) [`5b0be5a`](https://github.com/ngrok/mantle/commit/5b0be5a7ffb8372984477da21cbb85b139d04e3f) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - no-op patch to verify publish CI

- Updated dependencies [[`5b0be5a`](https://github.com/ngrok/mantle/commit/5b0be5a7ffb8372984477da21cbb85b139d04e3f)]:
  - @ngrok/mantle@0.68.2

## 1.0.2

### Patch Changes

- [#1112](https://github.com/ngrok/mantle/pull/1112) [`ad24f11`](https://github.com/ngrok/mantle/commit/ad24f11155af28d4b3141c1fb77416577bc75ed2) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add README documentation for npm packages, switch to ES2025 preset

- Updated dependencies [[`d46e3b3`](https://github.com/ngrok/mantle/commit/d46e3b3fbdcdf561db1d90e89afc8cca8e374be3), [`ad24f11`](https://github.com/ngrok/mantle/commit/ad24f11155af28d4b3141c1fb77416577bc75ed2)]:
  - @ngrok/mantle@0.68.1

## 1.0.1

### Patch Changes

- [#1106](https://github.com/ngrok/mantle/pull/1106) [`41ce842`](https://github.com/ngrok/mantle/commit/41ce842787bcfb6386d94cba4e5e495a298c5a22) Thanks [@forzalupo](https://github.com/forzalupo)! - Themed code block with granular syntax highlighting: richer Shiki token color palette, semantic background tokens (`bg-card`/`bg-base`), redesigned copy button using `IconButton`, and subtler tab trigger styling. Server highlighter adds fine-grained token scope mappings for types, variables, operators, attributes, properties, and escape characters.

- Updated dependencies [[`4a81875`](https://github.com/ngrok/mantle/commit/4a81875621f00eb46887b2b83ab5e6021465d7d4), [`383d538`](https://github.com/ngrok/mantle/commit/383d53821a264e59c4532f45e07818f541bfb686), [`ab6da43`](https://github.com/ngrok/mantle/commit/ab6da43e32e3e2e2dadf29aa8d99fcb2738569f4), [`2be1db1`](https://github.com/ngrok/mantle/commit/2be1db1ffb23bb5719181f73090ef28d7e19a50f), [`41ce842`](https://github.com/ngrok/mantle/commit/41ce842787bcfb6386d94cba4e5e495a298c5a22)]:
  - @ngrok/mantle@0.68.0

## 1.0.0

### Minor Changes

- [#1018](https://github.com/ngrok/mantle/pull/1018) [`f27c01f`](https://github.com/ngrok/mantle/commit/f27c01fc3291344380f32018d65cd6d21381fcaa) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - CodeBlock: replace PrismJS with Shiki for build-time syntax highlighting, removing Shiki/Prism from the browser bundle

### Patch Changes

- Updated dependencies [[`36e5921`](https://github.com/ngrok/mantle/commit/36e59211a9b76f0542d2551bd28d858449d3a131), [`f27c01f`](https://github.com/ngrok/mantle/commit/f27c01fc3291344380f32018d65cd6d21381fcaa), [`36e5921`](https://github.com/ngrok/mantle/commit/36e59211a9b76f0542d2551bd28d858449d3a131), [`36e5921`](https://github.com/ngrok/mantle/commit/36e59211a9b76f0542d2551bd28d858449d3a131), [`54743f1`](https://github.com/ngrok/mantle/commit/54743f1deee01709952fcf5222e0ea205c282e5d)]:
  - @ngrok/mantle@0.67.0
