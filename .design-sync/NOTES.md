# claude.ai/design sync notes

Repo-specific facts for `/design-sync`. Read this before a re-sync.

## Build

- Run `buildCmd` in `config.json` before the converter. It chains three steps:
  1. `pnpm -w run build -F @ngrok/mantle` builds `dist/`.
  2. The Tailwind CLI compiles `tailwind-input.css` to `.cache/mantle.compiled.css`.
  3. `make-entry.mjs` writes the stand-in package at `.cache/pkg/`.
- Why the stand-in package: `@ngrok/mantle` ships subpath exports only, with no root entry. `make-entry.mjs` re-exports every JS subpath into one `index.js` plus `index.d.ts`. It also links `node_modules` so `@types/react` resolves.
- Why the Tailwind compile: `mantle.css` is Tailwind source (`@import "tailwindcss"`). Designs run no Tailwind, so the sync ships a precompiled sheet. It includes all four theme files and a safelist of layout and token utilities for the design agent (`@source inline(...)` in `tailwind-input.css`).
- The converter bounds `cssEntry` to the package dir, so `make-entry.mjs` copies the compiled sheet into `.cache/pkg/`.
- `dist/` is built with the React Compiler, so components call `c` from `react/compiler-runtime`. The converter maps that import to `window.React`, which keeps `c` on `__COMPILER_RUNTIME` only. `make-entry.mjs` writes a prelude that sets `React.c` before any module runs. Without it, every card renders empty with `import_compiler_runtime.c is not a function`.
- Use the repo's pinned toolchain: `mise x -- <cmd>`. The system Node was 23 and the repo pins 24.
- Converter command: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules packages/mantle/node_modules --out ./ds-bundle`. The `entry` is in config.
- The fork `overrides/source-kit.mjs` needs `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules` once per clone.
- Playwright: the repo pins 1.62.1, which matches cached Chromium build 1234. Install `playwright@1.62.1` into `.ds-sync/`.

## Grouping

- The fork `overrides/source-kit.mjs` groups each component by its docs-site folder (`apps/www/app/docs/components/<category>/<page>.mdx`). It falls back to the page named for the src dir. `layouts/` pages become the `layouts` group.
- `componentSrcMap` pins src paths the fuzzy match missed (icons, `HorizontalSeparatorGroup`, `ThemeDropdownMenuRadioGroup`). Its `null` entries hide cards for infrastructure exports that render nothing. Those stay importable from the bundle.

## Fonts and icons

- Fonts (Roobert, JetBrains Mono, Family) load at runtime from `assets.ngrok.com`. The CDN sends `Access-Control-Allow-Origin: *`. `fonts/fonts.css` keeps the remote `@font-face` rules. The converter drops the duplicate copies in `_ds_bundle.css` as "unresolvable src"; this is expected.
- `icons.mjs` merges 132 Phosphor icons into `window.Mantle` through `extraEntries`, because Phosphor is a peer dependency. `Folder`, `Pulse`, and `Webhooks` do not exist in the pinned Phosphor version.

## Previews

- Import everything from `"@ngrok/mantle"`, including the Phosphor `*Icon` names. A subpath import (`@ngrok/mantle/button`) bundles a second copy and breaks context identity.
- Open overlays: `defaultOpen` plus `modal={false}` renders the open state in the card. Set `overrides.<Name>` to `{"cardMode": "single", "viewport": "720x480"}`.
- `Tooltip` throws outside `TooltipProvider`. Wrap the preview in `TooltipProvider`.
- No `ThemeProvider` is needed: light-theme tokens apply on `:root` by default.
- Previews get no Tailwind compile. Only classes in the `tailwind-input.css` safelist, or classes some component uses, exist. Arbitrary values (`max-w-[400px]`, `aspect-[3/1]`) do nothing and give no warning.
- A bare `border` draws dark. Pair it with a token color (`border-card`, `border-form`).
- Never name a preview export `Error`, because it shadows the global. Use `Invalid`.
- `AlertDialog` and `Sheet` share the dialog primitive: `defaultOpen` plus `modal={false}` renders them in the card.
- `DropdownMenu.RadioGroup` and `DropdownMenu.CheckboxItem` ignore `defaultValue` and `defaultChecked`. Pass `value` and `checked` so the indicator shows.
- `Combobox.Content` does not portal, so `Combobox.Root defaultOpen` renders an open list in a normal cell. Give the wrapper a height such as `h-64`.
- `Combobox.Root defaultValue` sets the input text. `MultiSelect.Root defaultSelectedValue` sets the tags.
- Popover and Sheet move focus to their first focusable child, so the capture shows a focus ring. That is the real open state.
- `Toast.Root` renders inline without a `Toaster`. Compose `Toast.Root`, `Toast.Icon`, `Toast.Message`, and `Toast.Action` directly.
- `Flag` loads SVGs from `https://assets.ngrok.com/flags/<size>/<CODE>.svg`. Pass `loading="eager"` so the capture does not race the lazy load.
- `mantleCode` does no syntax highlighting at runtime, because the Vite plugin is absent. It keeps leading indentation, so write templates flush-left. In a template literal, write `\\` for a shell line continuation.
- `jsonCodeBlockValue(object)` highlights JSON at runtime, with colors and a fold toggle.
- `Kbd` is a fixed `size-5` box. Multi-character labels (`Esc`) overflow, so use one glyph (`↵`).
- `DataTable` needs the TanStack Table v9 helpers (`useTable`, `tableFeatures`, `createColumnHelper`, `createSortedRowModel`, the `sortFn_*` functions). `make-entry.mjs` passes the `export * from "@tanstack/react-table"` line through for them. `componentSrcMap` hides the PascalCase TanStack exports this adds (`FlexRender`, `Subscribe`, and the v8-era feature objects).
- Charts: `Root` defaults to `aspect-video w-full`. Use `className="h-64"` with `cardMode: "column"`. In a horizontal `BarChart`, `XAxis` stays the category axis, so a number `tickFormat` belongs on `YAxis`.
- Brand icons size by `1em`. Use `size-*` for the lettermark and policy-file icons and `h-auto w-*` for the wordmark. Color follows `text-*`.
- Since Mantle 0.88.0, `Tabs.List` draws no border and `hideBorder` is gone. Put `<Tabs.Separator />` after `Tabs.List` for the hairline; pill tabs take none.
- `ButtonGroup` `appearance="outlined"` is an unimplemented TODO in the source, so the preview skips it.
- `SplitButton` shows closed states only. An open-menu story needs `overrides.SplitButton: {"cardMode": "single", "viewport": "720x480"}`.

## Known render warns

- `ProgressBar value="indeterminate"` renders an empty track by design.
- `[TOKENS_MISSING]` `--var`, `--alert-dismiss-icon-color`, `--alert-dismiss-hover-bg`, `--alert-dismiss-icon-hover-color`: `Alert` sets the `--alert-dismiss-*` variables at runtime, and `--var` is a false positive from documentation text.

## Converter limits

- The converter's React shim (`lib/bundle.mjs`, which must not be forked) does not export `c` for `react/compiler-runtime`. The prelude in `make-entry.mjs` works around it. Drop the prelude once the converter maps `c`.

- Compound components (`Dialog`, `LineChart`, `Field`) emit `React.ComponentType<any>` parts in `<Name>.d.ts`. Their `<Name>.prompt.md` carries the real usage.
- The extractor drops a prop named `color` as a style-system prop. `dtsPropsFor` restores it on `Badge` and `Slider`. A new plain component with a `color` prop needs the same entry.

## Re-sync risks

- `dtsPropsFor.Badge` and `dtsPropsFor.Slider` copy those props bodies by hand. If either component's props change, regenerate the body (drop the entry, rebuild, copy the new body, and add `color` back).
- `icons.mjs` is a curated list. A Phosphor upgrade can rename or remove icons. Re-verify the names against `@phosphor-icons/react/dist/csr/<Name>.d.ts`.
- `tailwind-input.css` safelists class names by hand. A token rename in `mantle.css` silently drops the class. The conventions header names classes too: re-check them against `_ds_bundle.css`.
- Fonts and flags load from `assets.ngrok.com` at runtime. If the CDN drops `Access-Control-Allow-Origin: *`, designs fall back to system fonts.
- `make-entry.mjs` reads the built `dist/` export syntax (`export{a as B}` and `export*from"pkg"`). A bundler change in `tsdown` output can break that parsing. Watch the export count (213 at version 0.88.0).
- The `Calendar` card is the converter's auto-render, not an authored preview. Placeholder cards remain for 24 components, all authorable on a later sync.
