# @ngrok/mantle

## 0.70.1

### Patch Changes

- [#1148](https://github.com/ngrok-oss/mantle/pull/1148) [`6085190`](https://github.com/ngrok-oss/mantle/commit/60851902cd6ed01ea7c45429817cf16145d84167) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add missing `data-slot` attributes across the component library so every exported component and compound sub-part exposes a stable `data-slot="<name>"` (or `data-slot="<name>-<part>"`) styling hook. Also adds `asChild` support (via `Slot`) to `Empty.Root`, `Empty.Actions`, `Code`, and `ButtonGroup`.

  Components updated include (non-exhaustive): `Main`, `SkipToMainLink`, `Empty`, `CodeBlock`, `Tabs`, `TextArea`, `Toast`/`Toaster`, `Separator`, `HorizontalSeparatorGroup`, `Sheet`, `Skeleton`, `Switch`, `Table`, `Label`, `MediaObject`, `Popover`, `RadioGroup`, `Select`, `Flag`, `HoverCard`, `Icon`, `SvgOnly`, `Input`/`PasswordInput`, `Kbd`, `DescriptionList`, `Dialog`, `DropdownMenu`, `DataTable`, `MetaKey`, `CursorPagination`, `ProgressBar`, and `ProgressDonut`. `HoverCard.Trigger`, `Dialog.Trigger`/`Dialog.Close`, and `DropdownMenu.Trigger` are now thin wrappers around their underlying Radix primitives so they can carry a `data-slot` attribute.

  Note: `ProgressBar`'s existing `data-slot` values were renamed to follow the compound-component naming convention — `data-slot="progress"` → `data-slot="progress-bar"` and `data-slot="progress-indicator"` → `data-slot="progress-bar-indicator"`. Consumers styling against those specific values will need to update their selectors.

- [#1150](https://github.com/ngrok-oss/mantle/pull/1150) [`e623364`](https://github.com/ngrok-oss/mantle/commit/e623364b21f9e5b8159e8995fdcaf82700195fa6) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Anchors (`<a>` elements, including those rendered by the `Anchor` component) that are descendants of `Alert.Root` now inherit the alert's variant text color (e.g. `text-warning-700` inside a warning alert) and are underlined at all times — not just on hover. This keeps inline links visually coherent with the surrounding alert copy while still marking them as links.

  **Visual change**: consumers that currently render links inside `Alert.Root` will see those links shift from the default `text-accent-600` to the alert's priority color, and the underline will be persistent rather than hover-only.

- [#1150](https://github.com/ngrok-oss/mantle/pull/1150) [`e623364`](https://github.com/ngrok-oss/mantle/commit/e623364b21f9e5b8159e8995fdcaf82700195fa6) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add "when to use" guidance and WAI-ARIA cross-references to the `Tooltip`, `Popover`, and `HoverCard` compound-namespace JSDoc so editor hover tips surface the correct component for each use case.

## 0.70.0

### Minor Changes

- [#1147](https://github.com/ngrok-oss/mantle/pull/1147) [`5e3aca7`](https://github.com/ngrok-oss/mantle/commit/5e3aca7c859b54403c9845ce93538c8e0b46f929) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add `SkipToMainLink` and `Main` components for accessible "skip to main content" navigation. `SkipToMainLink` is a visually-hidden-until-focused link that uses the browser History API directly, so it works in any framework (React Router, Next.js, plain HTML). `Main` renders a focusable `<main id="main" tabIndex={-1}>` landmark designed to pair with it.

  Also registers a new `z-max` utility (backed by `--z-index-max: 2147483647`, i.e. int32 max) so consumers can stack elements above any other z-index layer.

### Patch Changes

- [#1107](https://github.com/ngrok-oss/mantle/pull/1107) [`4d35209`](https://github.com/ngrok-oss/mantle/commit/4d35209cd3ec2b15215e51107aec3de007768aa6) Thanks [@forzalupo](https://github.com/forzalupo)! - Internal: switch `=== undefined` / `!== undefined` checks to `== null` / `!= null` for consistency with the project's nullish-equality style. No behavior change.

## 0.69.2

### Patch Changes

- [#1126](https://github.com/ngrok-oss/mantle/pull/1126) [`545a09d`](https://github.com/ngrok-oss/mantle/commit/545a09d77c0503f7dfdffe5eb1cde69d59aa65f4) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump @ariakit/react from 0.4.25 to 0.4.26

## 0.69.1

### Patch Changes

- [#1141](https://github.com/ngrok-oss/mantle/pull/1141) [`f82feb8`](https://github.com/ngrok-oss/mantle/commit/f82feb81f2da67d332962cd16e138bd0de9ae45b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add a `Composition` section to every compound component doc page showing the structural tree of its parts (ASCII art). Rename existing `asChild`-style `Composition` sections on `Badge`, `Button`, `IconButton`, `Separator`, and `SplitButton` to `Polymorphism`. Rename the `Input` children-composition section to `Child Elements` and the `Dialog` tooltip section to `Combining with a Tooltip` to avoid colliding with the new `Composition` name.

  Add the same ASCII composition tree as a `@example Composition` block to the top-level namespace JSDoc of every compound component (`Accordion`, `Alert`, `AlertDialog`, `Card`, `CodeBlock`, `Combobox`, `Command`, `CursorPagination`, `DataTable`, `DescriptionList`, `Dialog`, `DropdownMenu`, `Empty`, `HoverCard`, `MediaObject`, `MultiSelect`, `Popover`, `ProgressBar`, `ProgressDonut`, `RadioGroup`, `Select`, `Sheet`, `SplitButton`, `Table`, `Tabs`, `Toast`, `Tooltip`) so consumers and LLMs see the full structural shape at a glance in IDE IntelliSense.

- [#1141](https://github.com/ngrok-oss/mantle/pull/1141) [`f82feb8`](https://github.com/ngrok-oss/mantle/commit/f82feb81f2da67d332962cd16e138bd0de9ae45b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Expand JSDoc coverage across `CodeBlock`, `Command`, `Dialog`, `Empty`, `Popover`, `Select`, and `Sheet` compound components and their sub-parts for improved IntelliSense and documentation.

- [#1141](https://github.com/ngrok-oss/mantle/pull/1141) [`f82feb8`](https://github.com/ngrok-oss/mantle/commit/f82feb81f2da67d332962cd16e138bd0de9ae45b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix several code fence metastring parsing bugs in `mantleCodeRehypePlugin`:
  - `mantleShowLineNumbers`, `mantleCollapsible`, and `mantleDisableCopy` are now stringified on HAST `<pre>` properties. Previously, boolean `false` values were dropped during HAST→JSX compilation, causing `showLineNumbers=false` fence meta to be silently ignored (the rendered `<pre>` ended up with `data-mantle-line-numbers="true"` and no left padding).
  - `collapsible=true`, `collapsible=false`, and `collapsible="true"` in fence meta are no longer silently dropped. The `collapsible` key now accepts the same bare-flag, key-value, and quoted-value forms as `disableCopy`.
  - When a key appears multiple times in fence meta (e.g. `title="first" title="second"`), `getMetaValue` now returns the last value, matching `parseMetastring` semantics. Previously it returned the first.
  - `tokenizeMetastring` now splits on tabs, newlines, and carriage returns in addition to spaces. Previously only literal spaces were treated as token separators, so meta like `title="Foo"\tcollapsible` was lexed as a single token.

## 0.69.0

### Minor Changes

- [#1138](https://github.com/ngrok-oss/mantle/pull/1138) [`3f06774`](https://github.com/ngrok-oss/mantle/commit/3f06774967405751d4eec8be9d479a6b5516a6d7) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add new `Empty` compound component for rendering empty states. Includes `Empty.Root`, `Empty.Icon`, `Empty.Title`, `Empty.Description`, and `Empty.Actions` sub-components.

## 0.68.7

### Patch Changes

- [#1134](https://github.com/ngrok-oss/mantle/pull/1134) [`5bde2bb`](https://github.com/ngrok-oss/mantle/commit/5bde2bb43fd24dff97db51d63a559650151d4ed3) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix InputContainer focus ring flicker by preventing mousedown default on non-input children. Use `flushSync` in PasswordInput to animate the eye icon inline in the click handler after React commits the new icon to the DOM. Remove `pointer-events-none` from validation feedback icons.

## 0.68.6

### Patch Changes

- [#1132](https://github.com/ngrok-oss/mantle/pull/1132) [`c0ea674`](https://github.com/ngrok-oss/mantle/commit/c0ea67486b837fba066000226630f74896ce8dcf) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix Input focus ring showing as black when clicking the PasswordInput visibility toggle by using `focus-within` for both ring size and color. Add a blink animation to the PasswordInput eye icon toggle that respects `prefers-reduced-motion`.

## 0.68.5

### Patch Changes

- [#1130](https://github.com/ngrok-oss/mantle/pull/1130) [`8c7866b`](https://github.com/ngrok-oss/mantle/commit/8c7866b085a3f508d29fd0eed8361f96f6977f62) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - fix(table): switch to border-separate for continuous sticky column indicator

  Replaced `border-collapse` with `border-separate border-spacing-0` on `Table.Element` and moved row dividers from group-level borders (`divide-y` on `<thead>`/`<tbody>`/`<tfoot>`) to cell-level borders. This prevents table cells from clipping overflow content, allowing the `StickyColIndicator` shadow strip to extend across row boundaries and render as one continuous vertical line instead of per-row segments with visible gaps.

  Also changed `overscroll-none` to `overscroll-x-none` on the table scroll container so vertical page scrolling is no longer blocked when hovering over a table.

## 0.68.4

### Patch Changes

- [#1122](https://github.com/ngrok-oss/mantle/pull/1122) [`327d46c`](https://github.com/ngrok-oss/mantle/commit/327d46ca0e950871fbae0b17f4e587b55afa27d0) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix table horizontal scroll masking, improve scroll perf, and add `DataTable.ActionHeader`.
  - **`Table.Root`**: Split into outer wrapper (border, rounded corners, background) and inner scroll container (`scroll-fade-x` mask, `overflow-x: auto`, `overflow-y: clip`, `overscroll-behavior: none`). Tables only scroll horizontally and no longer bounce.
  - **Scroll fade**: Left and right edge fades driven by scroll position. Right-side fade correctly suppressed when a sticky right column is present (`DataTable.ActionCell` / `DataTable.ActionHeader`).
  - **`DataTable.ActionCell`**: Replaced per-cell `box-shadow` with `bg-inherit` and a `StickyColIndicator` child span (1px divider + soft leftward gradient). Tracks the row's background including hover state.
  - **`DataTable.ActionHeader`** (new): Sticky `<th>` that pairs with `DataTable.ActionCell` so the pinned action column aligns across header and body rows during horizontal scroll.
  - **`useHorizontalOverflowObserver`**: Now tracks `scrolledToStart`, coalesces rapid-fire scroll/resize/mutation events via `requestAnimationFrame`, and uses `useLayoutEffect` so corrections apply before the browser paints.

  See `migrations/data-table-action-header-migration.md` for migration guidance.

## 0.68.3

### Patch Changes

- [#1119](https://github.com/ngrok-oss/mantle/pull/1119) [`0c20cf7`](https://github.com/ngrok-oss/mantle/commit/0c20cf736429dd6e0085d4f38affce86f7de8ee9) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Default `showLineNumbers` to `true` in `mantleCode()` and `highlightWithMantleShiki()` so code blocks show line numbers by default. Single-line shell snippets (`bash`, `sh`, `shell`) default to `false` since line numbers add noise to one-liners like install commands.

## 0.68.2

### Patch Changes

- [#1116](https://github.com/ngrok-oss/mantle/pull/1116) [`5b0be5a`](https://github.com/ngrok-oss/mantle/commit/5b0be5a7ffb8372984477da21cbb85b139d04e3f) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - no-op patch to verify publish CI

## 0.68.1

### Patch Changes

- [#1114](https://github.com/ngrok-oss/mantle/pull/1114) [`d46e3b3`](https://github.com/ngrok-oss/mantle/commit/d46e3b3fbdcdf561db1d90e89afc8cca8e374be3) Thanks [@forzalupo](https://github.com/forzalupo)! - Improve contrast in code block syntax highlighting

- [#1112](https://github.com/ngrok-oss/mantle/pull/1112) [`ad24f11`](https://github.com/ngrok-oss/mantle/commit/ad24f11155af28d4b3141c1fb77416577bc75ed2) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add README documentation for npm packages, switch to ES2025 preset

## 0.68.0

### Minor Changes

- [#1067](https://github.com/ngrok-oss/mantle/pull/1067) [`ab6da43`](https://github.com/ngrok-oss/mantle/commit/ab6da43e32e3e2e2dadf29aa8d99fcb2738569f4) Thanks [@forzalupo](https://github.com/forzalupo)! - Mantle theme updates: updates the functional colors, and modifies the color treatments across various components. It also adds font smoothing globally, while retaining the "auto" setting for Family, for a perceived higher weight.

### Patch Changes

- [#1099](https://github.com/ngrok-oss/mantle/pull/1099) [`4a81875`](https://github.com/ngrok-oss/mantle/commit/4a81875621f00eb46887b2b83ab5e6021465d7d4) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Bump dependencies: @ariakit/react to 0.4.24, browserslist to 4.28.2, tailwindcss peer to ^4.2.2

- [#1082](https://github.com/ngrok-oss/mantle/pull/1082) [`383d538`](https://github.com/ngrok-oss/mantle/commit/383d53821a264e59c4532f45e07818f541bfb686) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update ariakit and headlessui

- [#1104](https://github.com/ngrok-oss/mantle/pull/1104) [`2be1db1`](https://github.com/ngrok-oss/mantle/commit/2be1db1ffb23bb5719181f73090ef28d7e19a50f) Thanks [@forzalupo](https://github.com/forzalupo)! - Polish component styles: soften card/popover/dialog hover backgrounds with `color-mix()`, update SplitButton menu item icon placement and gap, use `bg-active-menu-item` in Command palette, reduce table header height, improve Combobox item icon sizing, and flatten DataTable ActionCell layout.

- [#1106](https://github.com/ngrok-oss/mantle/pull/1106) [`41ce842`](https://github.com/ngrok-oss/mantle/commit/41ce842787bcfb6386d94cba4e5e495a298c5a22) Thanks [@forzalupo](https://github.com/forzalupo)! - Themed code block with granular syntax highlighting: richer Shiki token color palette, semantic background tokens (`bg-card`/`bg-base`), redesigned copy button using `IconButton`, and subtler tab trigger styling. Server highlighter adds fine-grained token scope mappings for types, variables, operators, attributes, properties, and escape characters.

## 0.67.0

### Minor Changes

- [#1018](https://github.com/ngrok-oss/mantle/pull/1018) [`f27c01f`](https://github.com/ngrok-oss/mantle/commit/f27c01fc3291344380f32018d65cd6d21381fcaa) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - CodeBlock: replace PrismJS with Shiki for build-time syntax highlighting, removing Shiki/Prism from the browser bundle

### Patch Changes

- [#1089](https://github.com/ngrok-oss/mantle/pull/1089) [`36e5921`](https://github.com/ngrok-oss/mantle/commit/36e59211a9b76f0542d2551bd28d858449d3a131) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Tabs: use fade mask instead of shadow for horizontal overflow

- [#1089](https://github.com/ngrok-oss/mantle/pull/1089) [`36e5921`](https://github.com/ngrok-oss/mantle/commit/36e59211a9b76f0542d2551bd28d858449d3a131) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - fix(tabs): correct border width and focus ring clipping in horizontal classic tabs

- [#1089](https://github.com/ngrok-oss/mantle/pull/1089) [`36e5921`](https://github.com/ngrok-oss/mantle/commit/36e59211a9b76f0542d2551bd28d858449d3a131) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - fix(tabs): remove bottom border from horizontal classic tab list

- [#1088](https://github.com/ngrok-oss/mantle/pull/1088) [`54743f1`](https://github.com/ngrok-oss/mantle/commit/54743f1deee01709952fcf5222e0ea205c282e5d) Thanks [@forzalupo](https://github.com/forzalupo)! - MultiSelect: polish styling

## 0.66.17

### Patch Changes

- [#1071](https://github.com/ngrok-oss/mantle/pull/1071) [`c32a7d2`](https://github.com/ngrok-oss/mantle/commit/c32a7d23c2d55787042f702377bbdd1ddc923285) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bundle prismjs into the code-block dist output to fix `ReferenceError: Prism is not defined` with Vite 8 / Rollup 4. Previously, prismjs component files (plain IIFEs with no `module.exports`) were left as external imports, and Rollup had no visibility into their implicit dependency on the prismjs main module — causing it to evaluate a component before `window.Prism` was set. Bundling prismjs directly resolves the ordering issue transparently for all consuming apps.

- [#1086](https://github.com/ngrok-oss/mantle/pull/1086) [`537de55`](https://github.com/ngrok-oss/mantle/commit/537de55161043570699316e07162c6bf6d93282a) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add horizontal overflow scrolling to `Tabs.List` with scroll-position-aware edge shadows. When the tab list overflows its container it scrolls horizontally; fade shadows appear on whichever sides have hidden content and disappear when you reach an edge or when there is no overflow. Keyboard arrow-key navigation smoothly scrolls the focused trigger into view. Scroll bounce is disabled on the list.

## 0.66.16

### Patch Changes

- [#1076](https://github.com/ngrok-oss/mantle/pull/1076) [`582bec9`](https://github.com/ngrok-oss/mantle/commit/582bec9c0cd558fe14ebc5d461b2ddd6debc9c33) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add `--spacing-em` (`1em`) theme token for font-relative sizing utilities like `size-em`, `w-em`, `h-em`

- [#1076](https://github.com/ngrok-oss/mantle/pull/1076) [`582bec9`](https://github.com/ngrok-oss/mantle/commit/582bec9c0cd558fe14ebc5d461b2ddd6debc9c33) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add default `width="2.61em" height="1em"` to `NgrokWordmarkIcon` and `width="1em" height="1em"` to `NgrokLettermarkIcon` so they render at font size without requiring explicit sizing classes

## 0.66.15

### Patch Changes

- [#1074](https://github.com/ngrok-oss/mantle/pull/1074) [`284aaa9`](https://github.com/ngrok-oss/mantle/commit/284aaa9e1e3ad894612ea27739a1ae40aa6b06e6) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update NgrokLettermarkIcon dimensions

## 0.66.14

### Patch Changes

- [#1072](https://github.com/ngrok-oss/mantle/pull/1072) [`5dcc9be`](https://github.com/ngrok-oss/mantle/commit/5dcc9be89bf4b61216e7229e68b611bb64496082) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Rename `NgrokIcon` to `NgrokWordmarkIcon` and add new `NgrokLettermarkIcon`

## 0.66.13

### Patch Changes

- [#1061](https://github.com/ngrok-oss/mantle/pull/1061) [`1b0e722`](https://github.com/ngrok-oss/mantle/commit/1b0e7227c79396b48d4845b0ed5b534085aa91f7) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump `@ariakit/react` dependency.

## 0.66.12

### Patch Changes

- [#1064](https://github.com/ngrok-oss/mantle/pull/1064) [`24ffd25`](https://github.com/ngrok-oss/mantle/commit/24ffd2558567ec81c6576604be4848cdc8ceaa7e) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Decompose `Command.Dialog` into a `Root`/`Trigger`/`Content` namespace.

  **Breaking change**: `Command.Dialog` is now a compound namespace instead of a monolithic component. Migrate existing usage:

  ```diff
  - <Command.Dialog open={open} onOpenChange={setOpen}>
  -   <Command.Input placeholder="..." />
  -   <Command.List>...</Command.List>
  - </Command.Dialog>
  + <Command.Dialog.Root open={open} onOpenChange={setOpen}>
  +   <Command.Dialog.Content>
  +     <Command.Input placeholder="..." />
  +     <Command.List>...</Command.List>
  +   </Command.Dialog.Content>
  + </Command.Dialog.Root>
  ```

  The new `Command.Dialog.Trigger` sub-component allows opening the dialog from a button without managing `open` state manually:

  ```tsx
  <Command.Dialog.Root>
  	<Command.Dialog.Trigger asChild>
  		<Button type="button">Open Command Palette</Button>
  	</Command.Dialog.Trigger>
  	<Command.Dialog.Content>
  		<Command.Input placeholder="Type a command or search..." />
  		<Command.List>...</Command.List>
  	</Command.Dialog.Content>
  </Command.Dialog.Root>
  ```

  Also fixes two bugs:
  - `Command.Dialog` now correctly closes on Escape key press.
  - `Command.Separator` now automatically hides when all adjacent groups are filtered out.

## 0.66.11

### Patch Changes

- [#1057](https://github.com/ngrok-oss/mantle/pull/1057) [`930e5fb`](https://github.com/ngrok-oss/mantle/commit/930e5fbb5883369ca31a6904d6adc369b7912a23) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Export `fixMediaScriptContent` from `@ngrok/mantle/theme`. This function returns the raw JavaScript string for the inline `<script>` that fixes theme stylesheet `media` attributes — useful for legacy Go services and other non-React servers that need to inline it directly into SSR HTML.

## 0.66.10

### Patch Changes

- [#1055](https://github.com/ngrok-oss/mantle/pull/1055) [`714c79e`](https://github.com/ngrok-oss/mantle/commit/714c79e0362b3c2a1f4762755b97471041fb2a73) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - fix(use-copy-to-clipboard): remove unnecessary async wrapper, guarantee polyfill DOM cleanup

## 0.66.9

### Patch Changes

- [#1048](https://github.com/ngrok-oss/mantle/pull/1048) [`ca1ce98`](https://github.com/ngrok-oss/mantle/commit/ca1ce982cd68cae8e96181031a59673763c259d1) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - fix(code-block): restore syntax highlight token styles to mantle.css

  The `.token.*` styles were moved out of `mantle.css` into a colocated
  `syntax-highlight.css` imported as a side-effect in `code-block.tsx`.
  However, tsdown extracts CSS imports into a sidecar file without emitting
  a corresponding `import` in the bundled JS, so consuming apps never loaded
  the styles. Moved the token styles back into `mantle.css` where they are
  reliably included.

## 0.66.8

### Patch Changes

- [#1038](https://github.com/ngrok-oss/mantle/pull/1038) [`00fda43`](https://github.com/ngrok-oss/mantle/commit/00fda438dd9818cc3f3a63ab2d4798b96e28ec8f) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - **Breaking:** `MantleStylesheets` is renamed to `MantleStyleSheets` (and `MantleStylesheetsProps` → `MantleStyleSheetsProps`).

  The component no longer imports CSS `?url` paths internally. Instead, pass the browser-accessible CSS URLs as required props using the new `mantleStyleSheetUrls` helper, which collects the three Vite `?url` imports into a spreadable object:

  ```tsx
  // Before
  import { MantleStylesheets } from "@ngrok/mantle/theme";
  <MantleStylesheets nonce={nonce} ssrCookie={ssrCookie} />;

  // After
  import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";
  import darkHighContrastCssUrl from "@ngrok/mantle/mantle-dark-high-contrast.css?url";
  import lightHighContrastCssUrl from "@ngrok/mantle/mantle-light-high-contrast.css?url";
  import { mantleStyleSheetUrls, MantleStyleSheets } from "@ngrok/mantle/theme";

  const themeUrls = mantleStyleSheetUrls({
  	darkCssUrl,
  	lightHighContrastCssUrl,
  	darkHighContrastCssUrl,
  });

  <MantleStyleSheets {...themeUrls} nonce={nonce} ssrCookie={ssrCookie} />;
  ```

  This fixes a build error (`Unknown file extension ".css"`) in apps using React Router's SSR build, where `?url` imports inside node_modules are not transformed by Vite.

  When `forceTheme` is set to a non-light theme, only the link tag for that theme is rendered — the others are omitted to avoid unnecessary network requests. `forceTheme="light"` renders no link tags since light is the base theme with no dedicated lazy stylesheet.

## 0.66.7

### Patch Changes

- [#1036](https://github.com/ngrok-oss/mantle/pull/1036) [`1521814`](https://github.com/ngrok-oss/mantle/commit/1521814c50e01d0111bd03696c9698dd718ff5f1) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Move syntax highlight token styles into the code-block component

  The `.token.*` CSS rules for syntax highlighting were previously included unconditionally in `mantle.css`, adding to the critical CSS payload for all pages even those with no code blocks.

  These styles are now colocated in `packages/mantle/src/components/code-block/syntax-highlight.css` and imported as a side-effect from `code-block.tsx`. Vite bundles them as a CSS chunk associated with the code-block module — apps that never import `@ngrok/mantle/code-block` no longer pay the cost, and apps that do get the styles automatically.

- [#1036](https://github.com/ngrok-oss/mantle/pull/1036) [`1521814`](https://github.com/ngrok-oss/mantle/commit/1521814c50e01d0111bd03696c9698dd718ff5f1) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add `MantleStylesheets` component and split dark/high-contrast themes into separate CSS files

  **New: `MantleStylesheets`**

  A new component exported from `@ngrok/mantle/theme` that renders `<link rel="stylesheet">` tags for the dark, light-high-contrast, and dark-high-contrast theme CSS files. Each stylesheet is gated behind a `media` attribute matching its OS preference, making it non-render-blocking for users whose OS does not match.

  Place it in `<head>`, immediately after `<PreventWrongThemeFlashScript>`:

  ```tsx
  <head>
  	<PreventWrongThemeFlashScript nonce={nonce} />
  	<MantleStylesheets nonce={nonce} ssrCookie={loaderData?.ssrCookie} />
  </head>
  ```

  Props:
  - `forceTheme?: ResolvedTheme` — force a specific theme's stylesheet to `media="all"` unconditionally (e.g. for a dark-only app)
  - `ssrCookie?: string` — pass the extracted theme cookie (via `extractThemeCookie`) so the server renders the correct `media` attribute directly in SSR HTML, eliminating FOUC for users with a manually-selected non-system theme
  - `nonce?: string` — CSP nonce for the inline fix script

  An inline `<script>` is rendered after the `<link>` tags. It runs synchronously before first paint and corrects any `media` attributes based on `html[data-applied-theme]` set by `PreventWrongThemeFlashScript`, covering cases where `ssrCookie` is not provided. On the client, a `MutationObserver` watches `html[data-applied-theme]` to keep media attributes in sync as the user changes their theme.

  **New CSS exports**

  Three new CSS files are now exported from `@ngrok/mantle`:
  - `@ngrok/mantle/mantle-dark.css` — dark theme custom properties
  - `@ngrok/mantle/mantle-light-high-contrast.css` — light high-contrast theme custom properties
  - `@ngrok/mantle/mantle-dark-high-contrast.css` — dark high-contrast theme custom properties

  These files contain only CSS custom property blocks and do not need to be added to your app's `@import` chain — `MantleStylesheets` handles loading them via `<link>` tags. `mantle.css` continues to hold the light theme and all Tailwind directives and must remain in your CSS `@import` chain as before.

- [#1036](https://github.com/ngrok-oss/mantle/pull/1036) [`1521814`](https://github.com/ngrok-oss/mantle/commit/1521814c50e01d0111bd03696c9698dd718ff5f1) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add `@ngrok/mantle-vite-plugins` package and `source-all.css`, optimize `mantle.css`

  **New: `@ngrok/mantle-vite-plugins`**

  A new package that exports `mantleSourcePlugin` — a Vite plugin that writes targeted Tailwind `@source` directives into your global CSS file for only the `@ngrok/mantle` components your app actually imports. Scans `.ts`, `.tsx`, `.js`, `.jsx`, `.mdx`, and `.md` files. Uses a disk-write approach (required because `@tailwindcss/vite` reads CSS from disk at startup before Vite's transform pipeline runs).

  **New: `@ngrok/mantle/source-all.css`**

  A zero-configuration alternative to `mantleSourcePlugin`. Import it alongside `mantle.css` to tell Tailwind to scan all mantle component dist files:

  ```css
  @import "@ngrok/mantle/mantle.css";
  @import "@ngrok/mantle/source-all.css";
  ```

  Use this for apps that import most or all mantle components. Use `mantleSourcePlugin` for apps that import a subset and want the smallest possible CSS output.

  **`mantle.css` optimizations**
  - Removed `@source "../dist"` — source scanning is now opt-in via `source-all.css` or `mantleSourcePlugin`
  - Deduplicated `--color-gray-*` in light/dark themes using `var(--color-neutral-*)` aliases
  - Removed 21 light-theme color overrides (`neutral-50`–`neutral-900`, all `red-*` shades) that were identical to Tailwind v4 defaults
  - Moved ~60 semantic tokens (`--background-color-base`, etc.) from `@theme {}` to `@theme inline {}` to stop generating unused utility classes like `bg-background-color-base`

## 0.66.6

### Patch Changes

- [#1034](https://github.com/ngrok-oss/mantle/pull/1034) [`949ec0f`](https://github.com/ngrok-oss/mantle/commit/949ec0fb0ca512143eb6f355efb88efbf9f1b518) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update `font-display` policy for core fonts: `roobert` and `jetbrains-mono` (normal) use `swap`, italic faces (`jetbrains-mono-italic`, `family-italic`) use `optional`, `family-regular` stays `fallback`.

## 0.66.5

### Patch Changes

- [#1032](https://github.com/ngrok-oss/mantle/pull/1032) [`b9a04cc`](https://github.com/ngrok-oss/mantle/commit/b9a04ccbea762504b2dddd450757729dcefe3aa5) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - **Add** `preloadFontLink(name: CoreFontName): string` — returns an HTTP `Link` header value that preloads a single core font. Sending preload hints as response headers lets the browser start fetching fonts before it parses any HTML, improving LCP on mobile.

  **Remove** `MantleThemeHeadContent` and `PreloadCoreFonts`.

  **Migration:** use `PreventWrongThemeFlashScript` in `<head>` and `preloadFontLink` in your HTTP response headers. For apps without header control, use individual `PreloadFont` elements instead.

  ```ts
  // entry.server.tsx — send font preloads as HTTP Link headers
  import { assetsCdnOrigin, preloadFontLink } from "@ngrok/mantle/theme";

  responseHeaders.set(
  	"Link",
  	[
  		`<${assetsCdnOrigin}>; rel=preconnect; crossorigin`,
  		preloadFontLink("roobert"),
  		preloadFontLink("jetbrains-mono"),
  		preloadFontLink("family-regular"),
  	].join(", "),
  );
  ```

  ```tsx
  // root.tsx — only the FOUC script in <head>
  import { PreventWrongThemeFlashScript } from "@ngrok/mantle/theme";

  <head>
  	<PreventWrongThemeFlashScript nonce={nonce} />
  </head>;
  ```

  ```tsx
  // Non-SSR fallback — no header control
  import { PreloadFont, PreventWrongThemeFlashScript } from "@ngrok/mantle/theme";

  <head>
  	<PreventWrongThemeFlashScript nonce={nonce} />
  	<PreloadFont name="roobert" />
  	<PreloadFont name="jetbrains-mono" />
  	<PreloadFont name="family-regular" />
  </head>;
  ```

## 0.66.4

### Patch Changes

- [#1030](https://github.com/ngrok-oss/mantle/pull/1030) [`2b740bb`](https://github.com/ngrok-oss/mantle/commit/2b740bbf4e6dc42d6a674e2bd25ee04367ef47bf) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - export PreventWrongThemeFlashScript

## 0.66.3

### Patch Changes

- [`0dac608`](https://github.com/ngrok-oss/mantle/commit/0dac6083db43e746213fa4047ac03aaca3e9bce5) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Improve code block utility performance by speeding up indentation normalization and `fmtCode`, adding LRU caching for repeated syntax highlighting, and replacing linear language/indentation lookups with set membership checks. Also normalize CRLF input correctly, rename the indentation normalizer to `normalize-indentation`, and guard line-number expansion against excessively large ranges.

- [#1028](https://github.com/ngrok-oss/mantle/pull/1028) [`11f4575`](https://github.com/ngrok-oss/mantle/commit/11f45750cf33affe31108f0e717e26e3ffbf1705) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - add individual PreloadFont component, preload a core font by name

## 0.66.2

### Patch Changes

- [#1023](https://github.com/ngrok-oss/mantle/pull/1023) [`bc1bc6c`](https://github.com/ngrok-oss/mantle/commit/bc1bc6cbb8ebbb34a6a771c4f60b60c2e0271757) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - multi-select.tsx
  - close the combobox popover on `Escape` at the multi-select trigger level

  dialog/primitive.tsx
  - centralize `onInteractOutside` / `onPointerDownOutside` prompt-protection
  - add `preventCloseOnNestedPopupEscape(...)`
  - detect focused nested popup owners via `aria-expanded="true"` + `aria-controls`
  - only prevent parent modal close while the controlled popup is still mounted/open
  - add JSDoc documenting the first-ESC / second-ESC flow

  dialog.tsx
  - remove duplicated `onInteractOutside` / `onPointerDownOutside` wrappers

  sheet.tsx
  - remove duplicated `onInteractOutside` / `onPointerDownOutside` wrappers

  alert-dialog.tsx
  - remove duplicated `onInteractOutside` / `onPointerDownOutside` wrappers

## 0.66.1

### Patch Changes

- [#1004](https://github.com/ngrok-oss/mantle/pull/1004) [`b04e08f`](https://github.com/ngrok-oss/mantle/commit/b04e08f14262c1dfad91384e9a6ebdeb7be4b5fe) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies: tailwind, ariakit, react-day-picker

- [#1021](https://github.com/ngrok-oss/mantle/pull/1021) [`aab7d30`](https://github.com/ngrok-oss/mantle/commit/aab7d305ed2d5222b82dfe701377738c0e5f2c10) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Swap from tsup to tsdown (6.2x speedup)

- [#1022](https://github.com/ngrok-oss/mantle/pull/1022) [`df6d158`](https://github.com/ngrok-oss/mantle/commit/df6d158e4ff64406c5d84a71a3e9d0278ffc3c38) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix `MultiSelect.Content` inside modal `Sheet`, `Dialog`, and `AlertDialog` containers so it works with the default modal behavior without requiring `modal={false}`.

## 0.66.0

### Minor Changes

- [#997](https://github.com/ngrok-oss/mantle/pull/997) [`612171b`](https://github.com/ngrok-oss/mantle/commit/612171b3afb4fb44e5695445d69418bd621a203e) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add MultiSelect component

## 0.65.0

### Minor Changes

- [#1000](https://github.com/ngrok-oss/mantle/pull/1000) [`56a5245`](https://github.com/ngrok-oss/mantle/commit/56a5245e386fc0dde2688c25d95b52a1d7c1e871) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add `@ngrok/mantle/utils` export and new `useInView` hook.

  **Breaking changes:**
  - `@ngrok/mantle/compose-refs` is removed. Import `composeRefs` from `@ngrok/mantle/utils` and `useComposedRefs` from `@ngrok/mantle/hooks` instead.
  - `@ngrok/mantle/utils/sorting` is removed. Import sorting utilities from `@ngrok/mantle/utils` instead.

  **New exports at `@ngrok/mantle/utils`:**
  - `inView(element, onStart, options)` — framework-agnostic `IntersectionObserver` helper that calls `onStart` when an element enters the viewport. If `onStart` returns a function, it is called when the element leaves. Returns a cleanup function that disconnects the observer.
  - `composeRefs` and `useComposedRefs` — moved from `@ngrok/mantle/compose-refs`.
  - All sorting utilities — moved from `@ngrok/mantle/utils/sorting`.

  **New hook at `@ngrok/mantle/hooks`:**
  - `useInView(ref, options)` — React hook that returns `true` when the referenced element is visible in the viewport. Supports `root`, `margin`, `amount`, `once`, and `initial` options.

### Patch Changes

- [#1001](https://github.com/ngrok-oss/mantle/pull/1001) [`922a053`](https://github.com/ngrok-oss/mantle/commit/922a053d84fb8ad8f51c42fe1058fb49da7be55d) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Address review feedback from PR #1000.
  - `inView`: call `observer.unobserve(element)` before `observer.disconnect()` in the cleanup function for cleaner teardown.
  - `useInView`: restore intentional omission of `isInView` from `useEffect` deps (matching the upstream motion implementation); replace the bare eslint-disable comment with an explanation of why including `isInView` would cause the observer to restart on every visibility change.
  - `tsup.config.ts`: exclude `compose-refs` and `sorting` from individual build entries since they are now consolidated into the `./utils` export.
  - `hooks.mdx`: fix missing `forwardRef` import in the `useComposedRefs` code example.
  - `hooks.mdx`: remove `inView` from the hooks page; it now has a dedicated page under the new Utils section.
  - `hooks.mdx`: add a live interactive demo for `useInView`.
  - Changeset: correct version bump type to `major` (breaking changes) and clarify `useComposedRefs` migration path to `@ngrok/mantle/hooks`.
  - Add `use-in-view.test.tsx` test coverage for the `useInView` hook.
  - Add a Utils section to the docs site with dedicated pages for `cx`, `color`, `inView`, `composeRefs`, and `sorting`.

- [#1002](https://github.com/ngrok-oss/mantle/pull/1002) [`f6e8271`](https://github.com/ngrok-oss/mantle/commit/f6e8271c70f6932d657b552f8cb24bebe6094a2a) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add optional `icon` prop to `Alert.DismissIconButton`.

  The dismiss button now accepts an `icon` prop (`ReactNode`) to render a custom icon in place of the default `X` icon.

- [#999](https://github.com/ngrok-oss/mantle/pull/999) [`4ebf12b`](https://github.com/ngrok-oss/mantle/commit/4ebf12bdc73f6c88f7968b2378b94b8ff1a3e0eb) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump tsconfig target/lib to ES2023

- [#994](https://github.com/ngrok-oss/mantle/pull/994) [`c4d9812`](https://github.com/ngrok-oss/mantle/commit/c4d9812c9c14924418339d52aa06be61191cd224) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump up min version of tailwind

## 0.64.3

### Patch Changes

- [#990](https://github.com/ngrok-oss/mantle/pull/990) [`16c731a`](https://github.com/ngrok-oss/mantle/commit/16c731a10cc1bbfd6299ff0350171ffa48c261e5) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - update to tailwind 4.2.0

- [#988](https://github.com/ngrok-oss/mantle/pull/988) [`7e59d87`](https://github.com/ngrok-oss/mantle/commit/7e59d8722fcf2585105b580e752bf9356e7dea9a) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update dropdown, select, and combobox menu item styling

## 0.64.2

### Patch Changes

- [#985](https://github.com/ngrok-oss/mantle/pull/985) [`ce626cc`](https://github.com/ngrok-oss/mantle/commit/ce626cc088b7fcf3dc0a36e9c2fa6a2098f5d569) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Slider: Add `color` prop to customize the range fill color (defaults to `"bg-accent-500"`), and `showTicks` prop to render tick marks at each `step` interval. Also adds `--color-card-border` and `--color-card-border-muted` semantic color tokens.

## 0.64.1

### Patch Changes

- [#980](https://github.com/ngrok-oss/mantle/pull/980) [`c2735ed`](https://github.com/ngrok-oss/mantle/commit/c2735ed94e9d7ab8b0e5faec42d19deeb4846cd7) Thanks [@dependabot](https://github.com/apps/dependabot)! - Fix accessibility and linting issues in `Input` and `RadioGroup.InputSandbox`: replace `aria-disabled`/`aria-invalid` CSS hooks on wrapper divs with `data-disabled`, add `role="none"` to presentational wrapper divs

- [#984](https://github.com/ngrok-oss/mantle/pull/984) [`b3a32ec`](https://github.com/ngrok-oss/mantle/commit/b3a32ec036d9913cb2d8260902615d47f44e7968) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Change `font-display` from `swap` to `fallback` in all `@font-face` declarations to eliminate layout shift (font bounce) while still downloading and caching fonts for subsequent loads

- [#981](https://github.com/ngrok-oss/mantle/pull/981) [`e43df1c`](https://github.com/ngrok-oss/mantle/commit/e43df1c81fb5881376756e6918210ec7927cdc82) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Bump up Slider thumb shadow to shadow-md (from shadow-sm)

- [#980](https://github.com/ngrok-oss/mantle/pull/980) [`c2735ed`](https://github.com/ngrok-oss/mantle/commit/c2735ed94e9d7ab8b0e5faec42d19deeb4846cd7) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update tailwind-merge

## 0.64.0

### Minor Changes

- [#974](https://github.com/ngrok-oss/mantle/pull/974) [`623935c`](https://github.com/ngrok-oss/mantle/commit/623935c925afad2675aab412ae8ee92e840b7b2f) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Remove `AutoScrollToHash` component and `useAutoScrollToHash` hook. This also removes `react-router` as a peer dependency of `@ngrok/mantle`. If you were using `AutoScrollToHash`, move the implementation into your app directly.

- [#973](https://github.com/ngrok-oss/mantle/pull/973) [`a8ff1c9`](https://github.com/ngrok-oss/mantle/commit/a8ff1c9857c44abf4bc87c69cc85bb2e54a0a439) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add NgrokIcon to Icons

- [#979](https://github.com/ngrok-oss/mantle/pull/979) [`68cc794`](https://github.com/ngrok-oss/mantle/commit/68cc7946d887bbca790c36ca9580c454be99cadc) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add new Slider component, supports single, range, and multiple use cases

### Patch Changes

- [#971](https://github.com/ngrok-oss/mantle/pull/971) [`5781aae`](https://github.com/ngrok-oss/mantle/commit/5781aae83604925bfb03cdbea1d3d85b8e9e47a0) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix doc block links

- [#978](https://github.com/ngrok-oss/mantle/pull/978) [`286fab3`](https://github.com/ngrok-oss/mantle/commit/286fab3721c6aabe27fddaf91e4a8dfb7ba8c5ea) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix jerky accordion close animation. Moved spacing from `padding-top` on the animated container to `margin-top` on the first child so it collapses smoothly with the height animation.

- [#974](https://github.com/ngrok-oss/mantle/pull/974) [`623935c`](https://github.com/ngrok-oss/mantle/commit/623935c925afad2675aab412ae8ee92e840b7b2f) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add explicit generic type parameters to `isValidElement` calls in `Button` and `Slot` for React 19 type compatibility. React 19 changed `ReactElement.props` from `any` to `unknown`, requiring explicit type annotations to access props safely. This change is fully backwards compatible with React 18.

- [#978](https://github.com/ngrok-oss/mantle/pull/978) [`286fab3`](https://github.com/ngrok-oss/mantle/commit/286fab3721c6aabe27fddaf91e4a8dfb7ba8c5ea) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix `CodeBlock.CopyButton` timeout lifecycle handling by clearing pending timers on unmount and before scheduling a new copy-state reset.

- [#975](https://github.com/ngrok-oss/mantle/pull/975) [`d9a7206`](https://github.com/ngrok-oss/mantle/commit/d9a72068b93aac1524334395fbe0fdc761c6e8cd) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix theme flash on hydration by reading the theme cookie during SSR. `useInitialHtmlThemeProps` now accepts an optional `ssrCookie` string so the server can render the correct theme class, eliminating the mismatch between server HTML and the inline script.

## 0.63.2

### Patch Changes

- [#969](https://github.com/ngrok-oss/mantle/pull/969) [`76e1afd`](https://github.com/ngrok-oss/mantle/commit/76e1afd09e6011650e6b4f3ed14ea348143e1591) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix `useIsBelowBreakpoint` performance regression during window resize. The `subscribe` and `getSnapshot` functions passed to `useSyncExternalStore` were recreated on every render, causing listener teardown/re-attach churn on each frame. They are now cached per breakpoint for referential stability.

- [#969](https://github.com/ngrok-oss/mantle/pull/969) [`76e1afd`](https://github.com/ngrok-oss/mantle/commit/76e1afd09e6011650e6b4f3ed14ea348143e1591) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Restore all `@custom-variant` definitions in `mantle.css` that were accidentally removed. This includes theme variants (`light`, `dark`, `high-contrast`, `dark-high-contrast`), aria/data attribute variants, hover media query variants (`hover-hover`, `hover-none`), and the `where` variant.

## 0.63.1

### Patch Changes

- [#966](https://github.com/ngrok-oss/mantle/pull/966) [`d26aee3`](https://github.com/ngrok-oss/mantle/commit/d26aee3e3ba025847aef6473a96942a86a8c4875) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix mantle.css exports

## 0.63.0

### Minor Changes

- [#963](https://github.com/ngrok-oss/mantle/pull/963) [`1a68417`](https://github.com/ngrok-oss/mantle/commit/1a684177f8c07e321620910a9edbb771091d7d52) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add "info" as a first-class semantic color (mirrors "accent")

- [#965](https://github.com/ngrok-oss/mantle/pull/965) [`fd7e2eb`](https://github.com/ngrok-oss/mantle/commit/fd7e2eb5119a69f1b505c07f7889ea57686c7258) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add new SplitButton component

### Patch Changes

- [#963](https://github.com/ngrok-oss/mantle/pull/963) [`1a68417`](https://github.com/ngrok-oss/mantle/commit/1a684177f8c07e321620910a9edbb771091d7d52) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix Anchor component target types to delegate to React's built-in types

- [#963](https://github.com/ngrok-oss/mantle/pull/963) [`1a68417`](https://github.com/ngrok-oss/mantle/commit/1a684177f8c07e321620910a9edbb771091d7d52) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix mantle.css theme syntax

- [#963](https://github.com/ngrok-oss/mantle/pull/963) [`1a68417`](https://github.com/ngrok-oss/mantle/commit/1a684177f8c07e321620910a9edbb771091d7d52) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Apply font-sans to components for consistent typography

- [#962](https://github.com/ngrok-oss/mantle/pull/962) [`030099b`](https://github.com/ngrok-oss/mantle/commit/030099b6645039f0aadde90324ee19feeeef94c5) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update react-day-picker

## 0.62.2

### Patch Changes

- [#957](https://github.com/ngrok-oss/mantle/pull/957) [`141490d`](https://github.com/ngrok-oss/mantle/commit/141490dec9ef4b6b5776986a14cac190b65adc77) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - fix return type of $cssProperties

## 0.62.1

### Patch Changes

- [#955](https://github.com/ngrok-oss/mantle/pull/955) [`bf79ae2`](https://github.com/ngrok-oss/mantle/commit/bf79ae237df0f9350daf8e998e3b4252f398a2b7) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - DescriptionList styling fixes

## 0.62.0

### Minor Changes

- [#954](https://github.com/ngrok-oss/mantle/pull/954) [`7235e48`](https://github.com/ngrok-oss/mantle/commit/7235e4823cb9232ef0ed2853bf1b8ad9af48d368) Thanks [@randseay](https://github.com/randseay)! - Add DescriptionList component.

  This component is a semantic wrapper for `<dl>`, `<dt>`, and `<dd>` elements. It allows for a more accessible and semantic way to display label/value pairs.

### Patch Changes

- [#946](https://github.com/ngrok-oss/mantle/pull/946) [`e095088`](https://github.com/ngrok-oss/mantle/commit/e095088e084fa07b138715d74ea04ff7f554f969) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add CssProperties, $cssProperties type and helper for supporting typechecking of react CSSProperties AND custom css properties (--foo-bar)

## 0.61.3

### Patch Changes

- [#939](https://github.com/ngrok-oss/mantle/pull/939) [`d2922d2`](https://github.com/ngrok-oss/mantle/commit/d2922d2b0199aa1361e11e483fed129c3fcd2d15) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - DataTable.HeaderSortButton: remove scaling when active

## 0.61.2

### Patch Changes

- [#935](https://github.com/ngrok-oss/mantle/pull/935) [`b03ef99`](https://github.com/ngrok-oss/mantle/commit/b03ef99e5a61b81b2b544cce970cfd1b38fed087) Thanks [@aaronshekey](https://github.com/aaronshekey)! - Add 2xs breakpoint (360px)

## 0.60.2

### Patch Changes

- [#912](https://github.com/ngrok-oss/mantle/pull/912) [`d6c1f46`](https://github.com/ngrok-oss/mantle/commit/d6c1f46e8d10c9783134ef49e1e159ad67a67cb3) Thanks [@aaronshekey](https://github.com/aaronshekey)! - Create fluid typography. Kill references to Inter.

- [#902](https://github.com/ngrok-oss/mantle/pull/902) [`da31911`](https://github.com/ngrok-oss/mantle/commit/da31911f4c78f86181f43a34b682e49ad84dc5e8) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update runtime dependencies: @ariakit/react, react-day-picker

- [#914](https://github.com/ngrok-oss/mantle/pull/914) [`e704a7d`](https://github.com/ngrok-oss/mantle/commit/e704a7d314f2341ccea49e6d50bd5f7aa0ae6e82) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update dependencies: react-day-picker and @ariakit/react

- [#914](https://github.com/ngrok-oss/mantle/pull/914) [`e704a7d`](https://github.com/ngrok-oss/mantle/commit/e704a7d314f2341ccea49e6d50bd5f7aa0ae6e82) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Toast: support keeping toasts open until manually dismissed by passing `duration_ms <= 0` or `Number.POSITIVE_INFINITY`

- [#902](https://github.com/ngrok-oss/mantle/pull/902) [`da31911`](https://github.com/ngrok-oss/mantle/commit/da31911f4c78f86181f43a34b682e49ad84dc5e8) Thanks [@dependabot](https://github.com/apps/dependabot)! - Switch to node-24 as LTS

## 0.60.1

### Patch Changes

- [#900](https://github.com/ngrok-oss/mantle/pull/900) [`5174f39`](https://github.com/ngrok-oss/mantle/commit/5174f3906faf163e575b9cb62f3970c4d426f0df) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Button, IconButton: scale w/ transition ease-out

## 0.60.0

### Minor Changes

- [#896](https://github.com/ngrok-oss/mantle/pull/896) [`b58edd7`](https://github.com/ngrok-oss/mantle/commit/b58edd7c1c97c06ce113a90717c947d6822342c3) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add Slot component with automatic className merging

  Introduces a new `@ngrok/mantle/slot` component that wraps Radix UI's Slot with automatic Tailwind CSS className merging using `cx`. All internal components now use the Mantle Slot instead of importing directly from Radix UI, providing consistent className merge behavior across the design system where child classes take priority over parent classes.

### Patch Changes

- [#893](https://github.com/ngrok-oss/mantle/pull/893) [`0507080`](https://github.com/ngrok-oss/mantle/commit/05070800b4cf647c9abcf2565902d5b1a1deb976) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Button, IconButton: add data-appearance, data-priority to DOM

## 0.59.1

### Patch Changes

- [#887](https://github.com/ngrok-oss/mantle/pull/887) [`eeca62d`](https://github.com/ngrok-oss/mantle/commit/eeca62d79949a0932c1906bcabf079dbd5a3089c) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix tooltip jsdoc urls

## 0.59.0

### Minor Changes

- [#885](https://github.com/ngrok-oss/mantle/pull/885) [`918bdd9`](https://github.com/ngrok-oss/mantle/commit/918bdd9078d1edffc7d670326f0600623a4406cc) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Promote Tooltip component out of preview

  The Tooltip component has been promoted from preview to stable. This includes:
  - Updated documentation route from `/components/preview/tooltip` to `/components/tooltip`
  - Updated all JSDoc URLs to reflect the new documentation path
  - Added comprehensive API reference for TooltipProvider, Tooltip.Root, Tooltip.Trigger, and Tooltip.Content
  - Improved tooltip arrow styling with proper positioning and background matching
  - Fixed Tailwind 4 dev mode class scanning by adding `@source "../src"` to mantle.css

## 0.58.4

### Patch Changes

- [#878](https://github.com/ngrok-oss/mantle/pull/878) [`9ecfcd4`](https://github.com/ngrok-oss/mantle/commit/9ecfcd47242496ad382451183a241cd76fd843b5) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies; bump min version of tailwind

- [#883](https://github.com/ngrok-oss/mantle/pull/883) [`e3d39ef`](https://github.com/ngrok-oss/mantle/commit/e3d39ef80e1ead067b2a27f3e960d45a432be732) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - move mantle.css to src/ and improve HMR
  - Moved `mantle.css` from `packages/mantle/assets/` to `packages/mantle/src/` to enable proper hot module reload during development
  - Updated `mantle.css` package export to use source conditions (`@ngrok/mantle/source` → `src/mantle.css`, `default` → `dist/mantle.css`), matching the pattern used for component exports
  - Added build step to copy `mantle.css` to `dist/` directory for production builds

## 0.58.3

### Patch Changes

- [#879](https://github.com/ngrok-oss/mantle/pull/879) [`8a66858`](https://github.com/ngrok-oss/mantle/commit/8a6685805fa2dc540a5e03a550ebf66e13cae644) Thanks [@acrobat130](https://github.com/acrobat130)! - enable an appearance prop on the tabs root component that allows the user to specify pill-style tabs

## 0.58.2

### Patch Changes

- [#873](https://github.com/ngrok-oss/mantle/pull/873) [`f8170b9`](https://github.com/ngrok-oss/mantle/commit/f8170b9f2a73cde6aa5dfc44b10f64f3c2eb8180) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies; add static white, static black, and ff00ff as colors

## 0.58.1

### Patch Changes

- [#871](https://github.com/ngrok-oss/mantle/pull/871) [`61b3eee`](https://github.com/ngrok-oss/mantle/commit/61b3eee335b17bcb12a5df170f070b60d82a1c42) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update Kbd bg color

## 0.58.0

### Minor Changes

- [#869](https://github.com/ngrok-oss/mantle/pull/869) [`e38e79a`](https://github.com/ngrok-oss/mantle/commit/e38e79a664f26a1793c74f2d4056c2194bb72507) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add Kbd component and documentation page for keyboard shortcuts

## 0.57.5

### Patch Changes

- [#864](https://github.com/ngrok-oss/mantle/pull/864) [`aa7f600`](https://github.com/ngrok-oss/mantle/commit/aa7f600d4abcc7d063da1911e2f2e0acc2d82bb3) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add `filter` and `shouldFilter` props to `Command.Dialog` for custom filtering behavior

## 0.57.4

### Patch Changes

- [#858](https://github.com/ngrok-oss/mantle/pull/858) [`df04845`](https://github.com/ngrok-oss/mantle/commit/df048454e61c20712309ac375547b1154e350a3d) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - fix: restore text-size-inherit utility

  Re-added `text-size-inherit` font-size utility that was accidentally removed in v0.57.3. This utility allows components to inherit font-size from their parent element.

  **Note:** This utility is named `text-size-inherit` (not `text-inherit`) to avoid conflicts with Tailwind's standard `text-inherit` utility which controls color inheritance.

  **Changes:**
  - Added `--text-size-inherit: inherit;` to `@theme inline` block
  - Added `text-size-inherit` to font-size class group in cx helper's tailwind-merge config
  - Added tests for proper class merging with text-size-inherit

## 0.57.3

### Patch Changes

- [#856](https://github.com/ngrok-oss/mantle/pull/856) [`20c2da9`](https://github.com/ngrok-oss/mantle/commit/20c2da97779a267ad4232f83167f357a07fe5a0f) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - fix: enable text-mono font-size overrides with cx helper

  Extended the `cx` helper's tailwind-merge configuration to recognize `text-mono` as a font-size class. This allows users to properly override the monospace font size in Table.Cell and CodeBlock components using standard Tailwind font-size utilities like `text-base`, `text-xl`, etc.

  **Before:**

  ```tsx
  <Table.Cell className="text-base">INV001</Table.Cell>
  // Both text-mono and text-base were present in className
  // text-mono took precedence → 13px font-size
  ```

  **After:**

  ```tsx
  <Table.Cell className="text-base">INV001</Table.Cell>
  // tailwind-merge properly removes text-mono
  // text-base takes effect → 16px font-size
  ```

  **Technical Details:**
  - Added `text-mono` to the `font-size` class group in `extendTailwindMerge` config
  - Added tests verifying proper class merging behavior
  - Updated table docs example to demonstrate font-size override

## 0.57.2

### Patch Changes

- [#854](https://github.com/ngrok-oss/mantle/pull/854) [`8819cb0`](https://github.com/ngrok-oss/mantle/commit/8819cb05a05a7db9415db439f0100104391bb41b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - fix: convert text-size-mono to text-mono for proper tailwind-merge support

  Changed the custom `@utility text-size-mono` to a proper Tailwind theme fontSize extension `--font-size-mono`, which generates the `text-mono` utility class. This allows `text-mono` to be properly overridden by other font-size utilities like `text-base` or `text-xl` when using the `cx` helper.

  **Breaking Change:** Users need to replace `text-size-mono` with `text-mono` in their code.

  **Before:**

  ```tsx
  <Table.Cell className="text-size-mono">...</Table.Cell>
  ```

  **After:**

  ```tsx
  <Table.Cell className="text-base">...</Table.Cell> // text-base now properly overrides the default text-mono
  ```

## 0.57.1

### Patch Changes

- [#852](https://github.com/ngrok-oss/mantle/pull/852) [`d5cbefb`](https://github.com/ngrok-oss/mantle/commit/d5cbefbbb04d507380c90f1e1a5d6642a6a3790c) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Command: export MetaKey component for platform-aware keyboard shortcuts

  Extract MetaKey as a reusable SSR-safe component that displays the appropriate modifier key (⌘ for macOS/iOS, Ctrl for others) in keyboard shortcut hints.

## 0.57.0

### Minor Changes

- [#849](https://github.com/ngrok-oss/mantle/pull/849) [`a83221a`](https://github.com/ngrok-oss/mantle/commit/a83221adbe84a309c77b19378ad5ed973584dee7) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Remove EuclidSquare bold/semibold; export new theme font helper components

## 0.56.0

### Minor Changes

- [#839](https://github.com/ngrok-oss/mantle/pull/839) [`7dc6877`](https://github.com/ngrok-oss/mantle/commit/7dc68778486e90dd92867c7ecd15450610bd6b8a) Thanks [@randseay](https://github.com/randseay)! - Implement Command component

## 0.55.5

### Patch Changes

- [#842](https://github.com/ngrok-oss/mantle/pull/842) [`0bdcaba`](https://github.com/ngrok-oss/mantle/commit/0bdcaba1b72080d4b90545ca3d3d559b6aed9b22) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - IconButton: add in sr-only label as inner children when using asChild

## 0.55.4

### Patch Changes

- [#840](https://github.com/ngrok-oss/mantle/pull/840) [`6d60f2e`](https://github.com/ngrok-oss/mantle/commit/6d60f2ec304241a3a5d98f78c0349eabae78826b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Table: set overscroll-x-none on Table.Root

## 0.55.3

### Patch Changes

- [#834](https://github.com/ngrok-oss/mantle/pull/834) [`235593b`](https://github.com/ngrok-oss/mantle/commit/235593be593f2d510ce1917792118c8fa0861ff9) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update ariakit and react-day-picker

- [#837](https://github.com/ngrok-oss/mantle/pull/837) [`ba79d27`](https://github.com/ngrok-oss/mantle/commit/ba79d27dd3d04039c81d86cf41abe23d192e13d3) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Theme: improve cookie parsing and reduce risk of FOUC, hydration issues

## 0.55.2

### Patch Changes

- [#828](https://github.com/ngrok-oss/mantle/pull/828) [`5cdda38`](https://github.com/ngrok-oss/mantle/commit/5cdda38c1278e0fa24f84816ecfc5065db2b6591) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - AutoScrollToHash + useAutoScrollToHash: switch to context provider, allow for programmatic scrollToHash()

## 0.55.1

### Patch Changes

- [#826](https://github.com/ngrok-oss/mantle/pull/826) [`48ce32d`](https://github.com/ngrok-oss/mantle/commit/48ce32d29cb6102620c3658fc5f435608e202248) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add react-router to peer dependencies of mantle, document AutoScrollToHash peerDep on react-router

## 0.55.0

### Minor Changes

- [#825](https://github.com/ngrok-oss/mantle/pull/825) [`d9dfa70`](https://github.com/ngrok-oss/mantle/commit/d9dfa703c8f3029a00f8fbd8b4f066fdfc0d3f92) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Export AutoScrollToHash, useAutoScrollToHash, and useScrollBehavior

### Patch Changes

- [#823](https://github.com/ngrok-oss/mantle/pull/823) [`05ca536`](https://github.com/ngrok-oss/mantle/commit/05ca536b24ca024d44c31bb53d6d6388a02887a4) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies

## 0.54.3

### Patch Changes

- [#813](https://github.com/ngrok-oss/mantle/pull/813) [`30580b7`](https://github.com/ngrok-oss/mantle/commit/30580b7c30b07421d2226143a3b0f5e2b46568c5) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump tw-animate-css

- [#815](https://github.com/ngrok-oss/mantle/pull/815) [`dd1eb1f`](https://github.com/ngrok-oss/mantle/commit/dd1eb1f5efeff8e044c808ea0f57267abc47ee55) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add visibilitychange handler for ThemeProvider

## 0.54.2

### Patch Changes

- [#810](https://github.com/ngrok-oss/mantle/pull/810) [`8005c93`](https://github.com/ngrok-oss/mantle/commit/8005c937d5780c45c2a3573023df5967851e08d2) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Theme: fix cross-tab theme sync when the cookie changes

## 0.54.1

### Patch Changes

- [#808](https://github.com/ngrok-oss/mantle/pull/808) [`1f943b7`](https://github.com/ngrok-oss/mantle/commit/1f943b7266c9bf3464d4271b8fdc93a421f59eab) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - remove microtask in FOUC script

## 0.54.0

### Minor Changes

- [#806](https://github.com/ngrok-oss/mantle/pull/806) [`c1162a4`](https://github.com/ngrok-oss/mantle/commit/c1162a40080c574acb76fba83f24b0c4d756a18b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Switch from localStorage to cookie for theme preference storage primitive

## 0.53.0

### Minor Changes

- [#804](https://github.com/ngrok-oss/mantle/pull/804) [`9286f3a`](https://github.com/ngrok-oss/mantle/commit/9286f3afb365ae4a7f8881905e8890a0ef7740ef) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Rename theme-provider export to theme

### Patch Changes

- [#803](https://github.com/ngrok-oss/mantle/pull/803) [`165981f`](https://github.com/ngrok-oss/mantle/commit/165981f4334a389da899787530cf8b80c2ff52a9) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update react day picker dependency

- [#801](https://github.com/ngrok-oss/mantle/pull/801) [`47ecff2`](https://github.com/ngrok-oss/mantle/commit/47ecff27f9bea00f5d4b4fc72fb9d281fb331174) Thanks [@aaronshekey](https://github.com/aaronshekey)! - Add the xs breakpoint to the breakpoint component

## 0.52.9

### Patch Changes

- [#797](https://github.com/ngrok-oss/mantle/pull/797) [`a5a1b91`](https://github.com/ngrok-oss/mantle/commit/a5a1b91428b682c32657540c84ff1912368bf734) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Dialog Overlay Primitive: add data-overlay attribute to Overlay primitive

## 0.52.8

### Patch Changes

- [#790](https://github.com/ngrok-oss/mantle/pull/790) [`2806bb4`](https://github.com/ngrok-oss/mantle/commit/2806bb4efd2cedaf5e6b1a4a3e40a79ed7a31f8d) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Combobox: fix scrolling presentation in content

- [#790](https://github.com/ngrok-oss/mantle/pull/790) [`2806bb4`](https://github.com/ngrok-oss/mantle/commit/2806bb4efd2cedaf5e6b1a4a3e40a79ed7a31f8d) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Combobox: bump up spacing between input and content

- [#789](https://github.com/ngrok-oss/mantle/pull/789) [`df7b954`](https://github.com/ngrok-oss/mantle/commit/df7b9546cfb478605528450346560f9fd8d70582) Thanks [@dependabot](https://github.com/apps/dependabot)! - bump headlessui version

## 0.52.7

### Patch Changes

- [#777](https://github.com/ngrok-oss/mantle/pull/777) [`a484cab`](https://github.com/ngrok-oss/mantle/commit/a484cab854475ccc0e4288d2a6046e896bbe553a) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Button: remove the need for inner span

- [#779](https://github.com/ngrok-oss/mantle/pull/779) [`37f40bd`](https://github.com/ngrok-oss/mantle/commit/37f40bd43c97665e412600ce991cb70a83524ae6) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Button, IconButton: add active:scale-[0.97]

## 0.52.6

### Patch Changes

- [#775](https://github.com/ngrok-oss/mantle/pull/775) [`3519c45`](https://github.com/ngrok-oss/mantle/commit/3519c45582baf2d2c74daeaddece917062c392db) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - anchor: fix ring class on focus-visible

- [#773](https://github.com/ngrok-oss/mantle/pull/773) [`17dcb26`](https://github.com/ngrok-oss/mantle/commit/17dcb264e1dd504c5cb78bd20ec0a32acfb7a503) Thanks [@dependabot](https://github.com/apps/dependabot)! - update tailwindcss min peer dep

## 0.52.5

### Patch Changes

- [#770](https://github.com/ngrok-oss/mantle/pull/770) [`9f55e0e`](https://github.com/ngrok-oss/mantle/commit/9f55e0ecebbb3dcaa0644a973038a758d1681acf) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Alert: when appearance="banner", also remove the top border

## 0.52.4

### Patch Changes

- [#767](https://github.com/ngrok-oss/mantle/pull/767) [`10899b2`](https://github.com/ngrok-oss/mantle/commit/10899b27d6b3dcc49222a558af86210cf99b82dc) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update tw-animate-css

- [#768](https://github.com/ngrok-oss/mantle/pull/768) [`b8cd5d3`](https://github.com/ngrok-oss/mantle/commit/b8cd5d35dcbe349c4d88d22786a4ec6dd1faeb35) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Alert: add appearance prop to support "banner" alerts

## 0.52.3

### Patch Changes

- [#763](https://github.com/ngrok-oss/mantle/pull/763) [`fe24bbb`](https://github.com/ngrok-oss/mantle/commit/fe24bbbfb36d9b325b7b92d1a29d53c7ab73cb5b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Card: fix how we render borders between Card.Header, Card.Body, and Card.Footer

## 0.52.2

### Patch Changes

- [#760](https://github.com/ngrok-oss/mantle/pull/760) [`9b8ea0b`](https://github.com/ngrok-oss/mantle/commit/9b8ea0b409420effb979f4f9a752fc3ed5d962b5) Thanks [@melanieseltzer](https://github.com/melanieseltzer)! - ProgressDonut: add `indeterminateRotationSpeed` prop to control spin speed. Fix default `animation-duration-[15s]` so it no longer overrides consumer-provided `animation-duration-*` classes.

## 0.52.1

### Patch Changes

- [#752](https://github.com/ngrok-oss/mantle/pull/752) [`be2c37a`](https://github.com/ngrok-oss/mantle/commit/be2c37a5df3b9908dd2ed48df0c58acb23ac5b19) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Combobox: fix ItemValue data-user-value bolding

## 0.52.0

### Minor Changes

- [#748](https://github.com/ngrok-oss/mantle/pull/748) [`2e7509c`](https://github.com/ngrok-oss/mantle/commit/2e7509c937086d51bd7c8dfa00d57cf2dc105212) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - add useIsBelowBreakpoint hook, improve performance of breakpoint hooks

- [#745](https://github.com/ngrok-oss/mantle/pull/745) [`9611901`](https://github.com/ngrok-oss/mantle/commit/9611901fc1db0daec0691044dcf95535bdf75218) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Rename InlineCode to Code

- [#746](https://github.com/ngrok-oss/mantle/pull/746) [`639eed2`](https://github.com/ngrok-oss/mantle/commit/639eed24e29b23856fec43b99ea11a20fe9da0eb) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add useIsHydrated hook

- [#746](https://github.com/ngrok-oss/mantle/pull/746) [`639eed2`](https://github.com/ngrok-oss/mantle/commit/639eed24e29b23856fec43b99ea11a20fe9da0eb) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add useBreakpoint hook

- [#746](https://github.com/ngrok-oss/mantle/pull/746) [`639eed2`](https://github.com/ngrok-oss/mantle/commit/639eed24e29b23856fec43b99ea11a20fe9da0eb) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add BrowserOnly component

### Patch Changes

- [#743](https://github.com/ngrok-oss/mantle/pull/743) [`9e2621c`](https://github.com/ngrok-oss/mantle/commit/9e2621c83d289ff71f864c1405dccd8367a139a0) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Switch Alert, Dialog, and AlertDialog Description components to render a div instead of a p by default

- [#746](https://github.com/ngrok-oss/mantle/pull/746) [`639eed2`](https://github.com/ngrok-oss/mantle/commit/639eed24e29b23856fec43b99ea11a20fe9da0eb) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update hooks documentation for useMatchesMediaQuery and useCopyToClipboard

## 0.51.3

### Patch Changes

- [#740](https://github.com/ngrok-oss/mantle/pull/740) [`bbfd6d4`](https://github.com/ngrok-oss/mantle/commit/bbfd6d418d51e8780c108fb905c42fbdb44e95ec) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Accordion: fix export object for compound component definition

## 0.51.2

### Patch Changes

- [#733](https://github.com/ngrok-oss/mantle/pull/733) [`55565dc`](https://github.com/ngrok-oss/mantle/commit/55565dcbb954f938f4f08ec2171959532a595813) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update react-day-picker and tw-animate-css

## 0.51.1

### Patch Changes

- [#731](https://github.com/ngrok-oss/mantle/pull/731) [`cd19eb1`](https://github.com/ngrok-oss/mantle/commit/cd19eb172a1bcad11137eecb9a0bd5f32e192088) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - DropdownMenu: support tooltips on disabled dropdown menu items

## 0.51.0

### Minor Changes

- [#730](https://github.com/ngrok-oss/mantle/pull/730) [`e61565f`](https://github.com/ngrok-oss/mantle/commit/e61565f9dc66197c65f377afed37642a99822856) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - DataTable: remove DataTable.Rows convenience component; instead prefer to map over rows directly

### Patch Changes

- [#728](https://github.com/ngrok-oss/mantle/pull/728) [`521d59f`](https://github.com/ngrok-oss/mantle/commit/521d59ffe88f8af4aae54d49b365593eeef0621f) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies

## 0.50.4

### Patch Changes

- [#722](https://github.com/ngrok-oss/mantle/pull/722) [`961e157`](https://github.com/ngrok-oss/mantle/commit/961e15757e9147818a9527126b77c002975d58c8) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - DataTable: support passing fn as child to DataTable.Rows

## 0.50.3

### Patch Changes

- [#719](https://github.com/ngrok-oss/mantle/pull/719) [`7cab99c`](https://github.com/ngrok-oss/mantle/commit/7cab99cb6fa934beae615be4e90391ec0727482b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Toast: for toast message, use font-body instead of font-sans

- [#721](https://github.com/ngrok-oss/mantle/pull/721) [`31c6ec0`](https://github.com/ngrok-oss/mantle/commit/31c6ec03a466da457e875eb61c7fee07ba56b3a3) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - DataTable: export cell component too

## 0.50.2

### Patch Changes

- [#717](https://github.com/ngrok-oss/mantle/pull/717) [`024cf70`](https://github.com/ngrok-oss/mantle/commit/024cf70f82bd0aed57992ecaa4002868861ecce2) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Colors: fix dark mode swap of white and black as semantic colors

- [#717](https://github.com/ngrok-oss/mantle/pull/717) [`024cf70`](https://github.com/ngrok-oss/mantle/commit/024cf70f82bd0aed57992ecaa4002868861ecce2) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - replace remaining hsl() usages with oklch() and --color-\* css vars

## 0.50.1

### Patch Changes

- [#714](https://github.com/ngrok-oss/mantle/pull/714) [`6507acf`](https://github.com/ngrok-oss/mantle/commit/6507acf7248389e94a6c841802241e14621df324) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix missing production dependency for tw-animate-css

## 0.50.0

### Minor Changes (0.x breaking)

- [#656](https://github.com/ngrok-oss/mantle/pull/656) [`e0846f8`](https://github.com/ngrok-oss/mantle/commit/e0846f8f5dc22ef63efc2fcb776b9161f4eace20) Thanks [@aaronshekey](https://github.com/aaronshekey)! - Migrate mantle to Tailwind v4

## 0.40.1

### Patch Changes

- [#711](https://github.com/ngrok-oss/mantle/pull/711) [`3f531c5`](https://github.com/ngrok-oss/mantle/commit/3f531c587caa33a532fb0cc2434cb15d321a302d) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update ariakit (combobox improvements)

## 0.40.0

### Minor Changes (0.x breaking)

- [#687](https://github.com/ngrok-oss/mantle/pull/687) [`a3b49ab`](https://github.com/ngrok-oss/mantle/commit/a3b49ab9a832c6636416792b73d648dc782265c3) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Implement composite named exports

## 0.32.3

### Patch Changes

- [#699](https://github.com/ngrok-oss/mantle/pull/699) [`82f26dc`](https://github.com/ngrok-oss/mantle/commit/82f26dccb2605cf9a1dab9e4d8d91d45f929e24d) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add nonce prop to MantleThemeHeadContent, update doc blocks

## 0.32.2

### Patch Changes

- [#695](https://github.com/ngrok-oss/mantle/pull/695) [`0b342d7`](https://github.com/ngrok-oss/mantle/commit/0b342d7675e53317324636309be01d76dfd7b63a) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update headlessui and sonner dependencies

## 0.32.1

### Patch Changes

- [#678](https://github.com/ngrok-oss/mantle/pull/678) [`c303597`](https://github.com/ngrok-oss/mantle/commit/c30359783e449583ac522bddb36ef92225e5ba84) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add explicit displayNames to all mantle components

- [#680](https://github.com/ngrok-oss/mantle/pull/680) [`7b6b15a`](https://github.com/ngrok-oss/mantle/commit/7b6b15afdcc42104dbefb9a1213d694c2c7d39dd) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - add missing intellisense jsdocs to all mantle components

## 0.32.0

### Minor Changes

- [#675](https://github.com/ngrok-oss/mantle/pull/675) [`4a65a5a`](https://github.com/ngrok-oss/mantle/commit/4a65a5ac00c0d656f0771503fbe1f8ffeada8057) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add ProgressBar component

## 0.31.6

### Patch Changes

- [#670](https://github.com/ngrok-oss/mantle/pull/670) [`bc3e6ac`](https://github.com/ngrok-oss/mantle/commit/bc3e6ac87bd453b7af82dddad013cd9fd7de0671) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - remove zod as a peerDependency of mantle

## 0.31.5

### Patch Changes

- [#662](https://github.com/ngrok-oss/mantle/pull/662) [`1cfccd6`](https://github.com/ngrok-oss/mantle/commit/1cfccd66c5e4091c34553436e422e2e1cda356a4) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Sprinkle use client everywhere

## 0.31.4

### Patch Changes

- [#660](https://github.com/ngrok-oss/mantle/pull/660) [`2fddd06`](https://github.com/ngrok-oss/mantle/commit/2fddd06a2d7ac056f022a96d64888230bb261dcf) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Change peerDependencies for react and react-dom

## 0.31.3

### Patch Changes

- [#642](https://github.com/ngrok-oss/mantle/pull/642) [`1bb8fdd`](https://github.com/ngrok-oss/mantle/commit/1bb8fdd7769f39dfc5fd2556cee5a8d08e3d006d) Thanks [@dependabot](https://github.com/apps/dependabot)! - update dependencies

- [#651](https://github.com/ngrok-oss/mantle/pull/651) [`57d5b60`](https://github.com/ngrok-oss/mantle/commit/57d5b6054b96c5e68ecafa35099aabcb1adbdce7) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies

- [#659](https://github.com/ngrok-oss/mantle/pull/659) [`1d43071`](https://github.com/ngrok-oss/mantle/commit/1d43071a93f4d5d618dd503ddf9dfbd2a89adf6b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fix mantle react, react-dom peer dependencies range

- [#658](https://github.com/ngrok-oss/mantle/pull/658) [`ad402db`](https://github.com/ngrok-oss/mantle/commit/ad402dbf34c05825538f89ddb4ee03cf778a0bce) Thanks [@melanieseltzer](https://github.com/melanieseltzer)! - Fix bug where `setValueOnClick` prop was destructured (to set a default) but then never passed along and used (so the consumer could never override it).

## 0.31.2

### Patch Changes

- [#643](https://github.com/ngrok-oss/mantle/pull/643) [`148dd76`](https://github.com/ngrok-oss/mantle/commit/148dd764cbcbd4025503e0cbcfb2a5ea24a40b76) Thanks [@aaronshekey](https://github.com/aaronshekey)! - Fix breakpoint configuration to allow for arbitrary breakpoint

## 0.31.1

### Patch Changes

- [#635](https://github.com/ngrok-oss/mantle/pull/635) [`baa2d7f`](https://github.com/ngrok-oss/mantle/commit/baa2d7fe2008c1e14baeec8618209e48c2ce835b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - RadioIndicator: add shrink-0 so the indicator does not shrink in flex contexts

## 0.31.0

### Minor Changes

- [#633](https://github.com/ngrok-oss/mantle/pull/633) [`0632cca`](https://github.com/ngrok-oss/mantle/commit/0632cca37f5376072f086256dfc25c69c973e53c) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - SelectItem: allow for icon slot

- [#633](https://github.com/ngrok-oss/mantle/pull/633) [`0632cca`](https://github.com/ngrok-oss/mantle/commit/0632cca37f5376072f086256dfc25c69c973e53c) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Icons: export AutoThemeIcon and ThemeIcon

### Patch Changes

- [#631](https://github.com/ngrok-oss/mantle/pull/631) [`2d18988`](https://github.com/ngrok-oss/mantle/commit/2d18988384fee665f88aa316e2bec112434cb35c) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies

- [#609](https://github.com/ngrok-oss/mantle/pull/609) [`fc8b793`](https://github.com/ngrok-oss/mantle/commit/fc8b793e1c7ea43b7575cff89f15ed645f3c9ce7) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies

## 0.30.0

### Minor Changes

- [#620](https://github.com/ngrok-oss/mantle/pull/620) [`c76d1bd`](https://github.com/ngrok-oss/mantle/commit/c76d1bd1c32fbc84ccbe69a176e8ea06326cfd28) Thanks [@aaronshekey](https://github.com/aaronshekey)! - Add `AlertDismissIconButton` to `Alert` component

### Patch Changes

- [#617](https://github.com/ngrok-oss/mantle/pull/617) [`c72c6e1`](https://github.com/ngrok-oss/mantle/commit/c72c6e1228f5b62a0fa7ec39957ac71081df2667) Thanks [@aaronshekey](https://github.com/aaronshekey)! - Table edge case refinements and a sans serif font on tooltips by default

## 0.29.0

### Minor Changes

- [#603](https://github.com/ngrok-oss/mantle/pull/603) [`264dc1b`](https://github.com/ngrok-oss/mantle/commit/264dc1b8947b9c44fac3eef97e22446c249e0f17) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies; use named \*Icon imports from phosphor

## 0.28.1

### Patch Changes

- [#595](https://github.com/ngrok-oss/mantle/pull/595) [`26cdffa`](https://github.com/ngrok-oss/mantle/commit/26cdffa6a10da1a6eb7b868db892f3c60e15bef6) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Revert phosphor update

## 0.28.0

### Minor Changes

- [#591](https://github.com/ngrok-oss/mantle/pull/591) [`2cf4f4c`](https://github.com/ngrok-oss/mantle/commit/2cf4f4c6cd219172f6d8131a4a6b2270152b53d4) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update phosphor icons to new suffix Icon imports

## 0.27.4

### Patch Changes

- [#589](https://github.com/ngrok-oss/mantle/pull/589) [`2eb2764`](https://github.com/ngrok-oss/mantle/commit/2eb2764c12bcb0cab0e9d99801dc1b8e0ed60dc4) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - RadioButton: don't highlight border on hover when checked AND disabled

## 0.27.3

### Patch Changes

- [#559](https://github.com/ngrok-oss/mantle/pull/559) [`9da7027`](https://github.com/ngrok-oss/mantle/commit/9da7027f0009b0f57df385377c73da262177efee) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - tsconfig: improve tsconfigs and remove unused imports/vars

- [#551](https://github.com/ngrok-oss/mantle/pull/551) [`fceb2ef`](https://github.com/ngrok-oss/mantle/commit/fceb2effdc828719a340110e5e3fd216d88ae564) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Table: improve component design and styling

- [#576](https://github.com/ngrok-oss/mantle/pull/576) [`ce359c0`](https://github.com/ngrok-oss/mantle/commit/ce359c0e5046d00af54814693dddad7b95099d66) Thanks [@dependabot](https://github.com/apps/dependabot)! - update dependencies

- [#568](https://github.com/ngrok-oss/mantle/pull/568) [`3d9c378`](https://github.com/ngrok-oss/mantle/commit/3d9c378c01d278e6376e8a668d465d93666b281a) Thanks [@dependabot](https://github.com/apps/dependabot)! - update dependencies

## 0.27.2

### Patch Changes

- [#544](https://github.com/ngrok-oss/mantle/pull/544) [`cc043a7`](https://github.com/ngrok-oss/mantle/commit/cc043a74bd909c4c1c4d77027fee10c8ae5653db) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - DataTable: fix react key errors in DataTableHead and DataTableRow

- [#546](https://github.com/ngrok-oss/mantle/pull/546) [`44cc9b9`](https://github.com/ngrok-oss/mantle/commit/44cc9b9d3eef4f09a87579350e12d12fcf7d78aa) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - DataTable: fix hover styles, add DataTableActionCell

- [#546](https://github.com/ngrok-oss/mantle/pull/546) [`44cc9b9`](https://github.com/ngrok-oss/mantle/commit/44cc9b9d3eef4f09a87579350e12d12fcf7d78aa) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Tailwind Preset: fix content glob, should point to dist folder now

## 0.27.1

### Patch Changes

- [#538](https://github.com/ngrok-oss/mantle/pull/538) [`1c2f1af`](https://github.com/ngrok-oss/mantle/commit/1c2f1af3d26841671fd53f2334d722790bd03454) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - DataTable: add most of the remaining core components

- [#536](https://github.com/ngrok-oss/mantle/pull/536) [`585624a`](https://github.com/ngrok-oss/mantle/commit/585624a29920d6c92d5e2bf81ea682a56cd89f47) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - DataTable: export both DataTableHeaderSortButton and DataTableHeader, decouple behavior to make it fully customizable

## 0.27.0

### Minor Changes

- [#533](https://github.com/ngrok-oss/mantle/pull/533) [`8211d3b`](https://github.com/ngrok-oss/mantle/commit/8211d3b636a5197b305ed4774d7316cf8cf09ca6) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Tailwind Preset: replace 'text-mono' with 'text-size-mono' (so it doesn't clash with tw-merge text-\* color classes)

### Patch Changes

- [#533](https://github.com/ngrok-oss/mantle/pull/533) [`8211d3b`](https://github.com/ngrok-oss/mantle/commit/8211d3b636a5197b305ed4774d7316cf8cf09ca6) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - DataTable: add tests to helper methods, render example on docs site

- [#533](https://github.com/ngrok-oss/mantle/pull/533) [`8211d3b`](https://github.com/ngrok-oss/mantle/commit/8211d3b636a5197b305ed4774d7316cf8cf09ca6) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Toast: change class from .mantle-prompt to .overlay-prompt, improve compat w/ legacy ui components

- [#533](https://github.com/ngrok-oss/mantle/pull/533) [`8211d3b`](https://github.com/ngrok-oss/mantle/commit/8211d3b636a5197b305ed4774d7316cf8cf09ca6) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Table: fix/improve styling

- [#533](https://github.com/ngrok-oss/mantle/pull/533) [`8211d3b`](https://github.com/ngrok-oss/mantle/commit/8211d3b636a5197b305ed4774d7316cf8cf09ca6) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update dependencies

## 0.26.0

### Minor Changes

- [#525](https://github.com/ngrok-oss/mantle/pull/525) [`bf41174`](https://github.com/ngrok-oss/mantle/commit/bf41174756a5fe1b563e5fe43ea6f80ec3df09d3) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add custom mantle icons exports (Sort, TrafficPolicyFile) and sorting helper functions, types

- [#527](https://github.com/ngrok-oss/mantle/pull/527) [`f702d8a`](https://github.com/ngrok-oss/mantle/commit/f702d8a8a228eb568f3273c650b0ad00d0b35adb) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - DataTable: add DataTableHeader component, which supports column sorting by default (if enabled on the column)

- [#527](https://github.com/ngrok-oss/mantle/pull/527) [`f702d8a`](https://github.com/ngrok-oss/mantle/commit/f702d8a8a228eb568f3273c650b0ad00d0b35adb) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Table: improve documentation and fix markup, exports to match html spec 1:1; improve styling and include horizontal overflow detection

### Patch Changes

- [#524](https://github.com/ngrok-oss/mantle/pull/524) [`38ac3db`](https://github.com/ngrok-oss/mantle/commit/38ac3dbadfa45dfa283bc4a8853966b190839776) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies

- [#527](https://github.com/ngrok-oss/mantle/pull/527) [`f702d8a`](https://github.com/ngrok-oss/mantle/commit/f702d8a8a228eb568f3273c650b0ad00d0b35adb) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Table: Improve Table component docs

## 0.25.2

### Patch Changes

- [#515](https://github.com/ngrok-oss/mantle/pull/515) [`eb03234`](https://github.com/ngrok-oss/mantle/commit/eb03234c6ef14d63d4e7d15320a6a8123ef16237) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - PopoverContent: add preferredWidth prop, use that instead of explicit width

- [#515](https://github.com/ngrok-oss/mantle/pull/515) [`eb03234`](https://github.com/ngrok-oss/mantle/commit/eb03234c6ef14d63d4e7d15320a6a8123ef16237) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Calendar: add min-w-min to months container (prevent overflow in nav)

## 0.25.1

### Patch Changes

- [#513](https://github.com/ngrok-oss/mantle/pull/513) [`052f571`](https://github.com/ngrok-oss/mantle/commit/052f57113ae811c6dbefbb293c0cb22fbcfaf950) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - AlertDialogContent, DialogContent: add preferredWidth prop

- [#510](https://github.com/ngrok-oss/mantle/pull/510) [`7dcc1e0`](https://github.com/ngrok-oss/mantle/commit/7dcc1e050bc181d2f193257d51a1df3092a016ef) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies

## 0.25.0

### Minor Changes

- [#501](https://github.com/ngrok-oss/mantle/pull/501) [`a669615`](https://github.com/ngrok-oss/mantle/commit/a6696155e7fab6651d331af6bfe6459b7b8ecac1) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - CodeBlock: add support for setting the indentation used (tabs vs spaces), fallback to detecting what the given language prefers or spaces if none

### Patch Changes

- [#500](https://github.com/ngrok-oss/mantle/pull/500) [`275f8d1`](https://github.com/ngrok-oss/mantle/commit/275f8d1b40bbc9e87d7271ddcab4b94748fc8744) Thanks [@dependabot](https://github.com/apps/dependabot)! - update dependencies

- [#501](https://github.com/ngrok-oss/mantle/pull/501) [`a669615`](https://github.com/ngrok-oss/mantle/commit/a6696155e7fab6651d331af6bfe6459b7b8ecac1) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - CodeBlock: improve documentation and intellisense

## 0.24.1

### Patch Changes

- [#497](https://github.com/ngrok-oss/mantle/pull/497) [`b5526a0`](https://github.com/ngrok-oss/mantle/commit/b5526a01de147d8ca7f74e0ceca3b0a0b6f5868d) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - AlertDialog: improve intellisense and docs, support asChild

- [#496](https://github.com/ngrok-oss/mantle/pull/496) [`8d88570`](https://github.com/ngrok-oss/mantle/commit/8d885708597d45decf0addf40dd5c0179f6b73c0) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Flag: improve intellisense

- [#496](https://github.com/ngrok-oss/mantle/pull/496) [`8d88570`](https://github.com/ngrok-oss/mantle/commit/8d885708597d45decf0addf40dd5c0179f6b73c0) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Icon: update docs and intellisense

- [#496](https://github.com/ngrok-oss/mantle/pull/496) [`8d88570`](https://github.com/ngrok-oss/mantle/commit/8d885708597d45decf0addf40dd5c0179f6b73c0) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Label: update docs and intellisense

- [#496](https://github.com/ngrok-oss/mantle/pull/496) [`8d88570`](https://github.com/ngrok-oss/mantle/commit/8d885708597d45decf0addf40dd5c0179f6b73c0) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - MediaObject: update docs and intellisense, add asChild support

- [#494](https://github.com/ngrok-oss/mantle/pull/494) [`c4961ac`](https://github.com/ngrok-oss/mantle/commit/c4961ac846a3d5dddac9d0c9cf371b14c63240a0) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Card: improve docs and intellisense, support asChild on all sub-components

- [#496](https://github.com/ngrok-oss/mantle/pull/496) [`8d88570`](https://github.com/ngrok-oss/mantle/commit/8d885708597d45decf0addf40dd5c0179f6b73c0) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Badge: improve intellisense

- [#493](https://github.com/ngrok-oss/mantle/pull/493) [`410bc33`](https://github.com/ngrok-oss/mantle/commit/410bc330fd2715ca47e1858a1c5949e02d3a7b7e) Thanks [@melanieseltzer](https://github.com/melanieseltzer)! - Combobox: fix intellisense on `ComboboxItemValue`

- [#496](https://github.com/ngrok-oss/mantle/pull/496) [`8d88570`](https://github.com/ngrok-oss/mantle/commit/8d885708597d45decf0addf40dd5c0179f6b73c0) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Skeleton: update docs and intellisense, add asChild support

## 0.24.0

### Minor Changes

- [#491](https://github.com/ngrok-oss/mantle/pull/491) [`97538d9`](https://github.com/ngrok-oss/mantle/commit/97538d9986c5b38098729b10acd3274ce28cc98b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Anchor: add support for icons and their placement, improve docs and intellisense

## 0.23.2

### Patch Changes

- [#489](https://github.com/ngrok-oss/mantle/pull/489) [`1c47edc`](https://github.com/ngrok-oss/mantle/commit/1c47edc8c4ac9a352befc154e11be5610f523870) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - CodeBlock: fix unescaped inner html on initial render

## 0.23.1

### Patch Changes

- [#486](https://github.com/ngrok-oss/mantle/pull/486) [`671867c`](https://github.com/ngrok-oss/mantle/commit/671867cb3a23797a28a0434b86e1be1f6df28955) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Switch: improve intellisense and docs, fix readOnly prop

- [#483](https://github.com/ngrok-oss/mantle/pull/483) [`247bbc4`](https://github.com/ngrok-oss/mantle/commit/247bbc45dde598f90862ebd051be8fad695f9312) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Separator, ProgressDonut: improve docs and intellisense

- [#485](https://github.com/ngrok-oss/mantle/pull/485) [`13d21f3`](https://github.com/ngrok-oss/mantle/commit/13d21f3d01ae93300fc379c8439834c03fbe1d5b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Checkbox: improve intellisense and docs

## 0.23.0

### Minor Changes

- [#478](https://github.com/ngrok-oss/mantle/pull/478) [`1b8857b`](https://github.com/ngrok-oss/mantle/commit/1b8857b0bfc23b027ffadf29f3bb8eb9a7535181) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add SandboxedOnClick component

- [#477](https://github.com/ngrok-oss/mantle/pull/477) [`de42d20`](https://github.com/ngrok-oss/mantle/commit/de42d2073df5d23609df63606e2ebbd9c4565e5b) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - SheetContent: add preferredWidth prop, remove side: "top" and "bottom" options

### Patch Changes

- [#469](https://github.com/ngrok-oss/mantle/pull/469) [`d879af8`](https://github.com/ngrok-oss/mantle/commit/d879af88e3aff48523b94cd618dee720813ba878) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies, add dependabot config, clean up scripts

- [#479](https://github.com/ngrok-oss/mantle/pull/479) [`e775e11`](https://github.com/ngrok-oss/mantle/commit/e775e1115626eb7b38480e36507e44d74ac45b5f) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - PopoverContent: prevent click events from bubbling out of the PopoverContent container

- [#480](https://github.com/ngrok-oss/mantle/pull/480) [`c87c906`](https://github.com/ngrok-oss/mantle/commit/c87c906f5d91c6d5988097eb8ca8f461038355a0) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - TextArea: improve docs and intellisense

## 0.22.2

### Patch Changes

- [#467](https://github.com/ngrok-oss/mantle/pull/467) [`1556c80`](https://github.com/ngrok-oss/mantle/commit/1556c80892e453eb0ce76ba4638a3c2ab79b03a6) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies

## 0.22.1

### Patch Changes

- [#464](https://github.com/ngrok-oss/mantle/pull/464) [`b55338e`](https://github.com/ngrok-oss/mantle/commit/b55338ea37f0f1a074713990bdcb96b998ef8c09) Thanks [@dependabot](https://github.com/apps/dependabot)! - Update dependencies

- [#466](https://github.com/ngrok-oss/mantle/pull/466) [`a708b7f`](https://github.com/ngrok-oss/mantle/commit/a708b7f298dcd75c5607f4a226f1fede0d593921) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Sheet: improve inline intellisense and docsite documentation

## 0.22.0

### Minor Changes

- [#462](https://github.com/ngrok-oss/mantle/pull/462) [`2e9f116`](https://github.com/ngrok-oss/mantle/commit/2e9f11667f8f2f895ac81883efc386e7df8131d1) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Checkbox: remove zodCheckbox export

### Patch Changes

- [#460](https://github.com/ngrok-oss/mantle/pull/460) [`e62f0ef`](https://github.com/ngrok-oss/mantle/commit/e62f0ef753984366b4c3f3bc53e656abfc0f4b98) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Select: improve component docs, add inline intellisense examples w/ links, make content width default to "trigger"

## 0.21.5

### Patch Changes

- [#458](https://github.com/ngrok-oss/mantle/pull/458) [`494430c`](https://github.com/ngrok-oss/mantle/commit/494430cfa5e08958de9fc8eb7710644362dee18b) Thanks [@dependabot](https://github.com/apps/dependabot)! - update prism to fix security vulnerability

## 0.21.4

### Patch Changes

- [#456](https://github.com/ngrok-oss/mantle/pull/456) [`2ed9953`](https://github.com/ngrok-oss/mantle/commit/2ed9953b76c231445a67a63b3f4be31158968306) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Alert: improve doc site entry and intellisense for each component; remove unused default priority and make priority required; add AlertIcon component

## 0.21.3

### Patch Changes

- [#454](https://github.com/ngrok-oss/mantle/pull/454) [`2ddbdab`](https://github.com/ngrok-oss/mantle/commit/2ddbdab61f0a875854452c11a3b7dba1913b4737) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - ProgressDonut: properly fix the render AND hydration issue

## 0.21.2

### Patch Changes

- [#452](https://github.com/ngrok-oss/mantle/pull/452) [`f76dc0e`](https://github.com/ngrok-oss/mantle/commit/f76dc0e7f3e862f4f50e0270fe29709facd88803) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - ProgressDonut: fix hydration error, add examples in intellisense

## 0.21.1

### Patch Changes

- [#450](https://github.com/ngrok-oss/mantle/pull/450) [`00de431`](https://github.com/ngrok-oss/mantle/commit/00de431a6f3f95d877a62a89a6d305d82b56b639) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - CodeBlock: fix alignment of absolutely positioned copy button

## 0.21.0

### Minor Changes

- [#428](https://github.com/ngrok-oss/mantle/pull/428) [`944e9a6`](https://github.com/ngrok-oss/mantle/commit/944e9a69b0e295d2794e6dbcbc3bdc6fc922e990) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add combobox component

### Patch Changes

- [#447](https://github.com/ngrok-oss/mantle/pull/447) [`8d47922`](https://github.com/ngrok-oss/mantle/commit/8d47922ad3d3cba9305eaab75552c9910f6af7e9) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Flags: add GB alias for UK flag

## 0.20.2

### Patch Changes

- [#444](https://github.com/ngrok-oss/mantle/pull/444) [`63ce798`](https://github.com/ngrok-oss/mantle/commit/63ce7986ea424774168209218d4562cbda5906d1) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Flags: rename Flags type to CountryCode, export countryCodes list and isCountryCode type predicate fn

## 0.20.1

### Patch Changes

- [#443](https://github.com/ngrok-oss/mantle/pull/443) [`46087c5`](https://github.com/ngrok-oss/mantle/commit/46087c5e763c2c0d034f5d9d1e1b48191dfe1ccd) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Flag: add border radius and inset transparent black border

- [#441](https://github.com/ngrok-oss/mantle/pull/441) [`2867bdf`](https://github.com/ngrok-oss/mantle/commit/2867bdfb23df6d35da1e50bd9ad95b65c70cc3e3) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Prep for react 19: swap react-19-deprecated ElementRef type for ComponentRef type

## 0.20.0

### Minor Changes

- [#439](https://github.com/ngrok-oss/mantle/pull/439) [`1523118`](https://github.com/ngrok-oss/mantle/commit/15231189ac7f5818fd963d4dc4162c5ca1cfebba) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add Flag component

## 0.19.17

### Patch Changes

- [#435](https://github.com/ngrok-oss/mantle/pull/435) [`0aac02a`](https://github.com/ngrok-oss/mantle/commit/0aac02a732b0c32c21c2183282a1c9fd0b7e5dc5) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - AlertDialog: actually export AlertDialogClose

## 0.19.16

### Patch Changes

- [#433](https://github.com/ngrok-oss/mantle/pull/433) [`4744706`](https://github.com/ngrok-oss/mantle/commit/474470667d728a02615fb68b9fc5612635c96882) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - AlertDialog: export AlertDialogClose

## 0.19.15

### Patch Changes

- [#431](https://github.com/ngrok-oss/mantle/pull/431) [`7358307`](https://github.com/ngrok-oss/mantle/commit/7358307706b78eb459803632df08547e588b5cca) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - DropdownMenuRadioItem: only take up space for the checkmark when an item is checked

## 0.19.14

### Patch Changes

- [#430](https://github.com/ngrok-oss/mantle/pull/430) [`ec4e2e4`](https://github.com/ngrok-oss/mantle/commit/ec4e2e4867e7eecfd8571abc4092e83ad1e3c2fe) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - button: fix underline on group-hover bug of <Button appearance="link"> bug

- [#427](https://github.com/ngrok-oss/mantle/pull/427) [`7b9ef0b`](https://github.com/ngrok-oss/mantle/commit/7b9ef0b44b0f16ff36bd2c9dcfc2d3a74915f1f7) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update dependencies

- [#425](https://github.com/ngrok-oss/mantle/pull/425) [`0dad7df`](https://github.com/ngrok-oss/mantle/commit/0dad7df13a14b59be0c53605bc3fec471ead73e1) Thanks [@dependabot](https://github.com/apps/dependabot)! - update dependencies

## 0.19.13

### Patch Changes

- [#422](https://github.com/ngrok-oss/mantle/pull/422) [`e87acd6`](https://github.com/ngrok-oss/mantle/commit/e87acd639bf7c5ad0826b0014733491400daa71f) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - types: export parseBooleanish

## 0.19.12

### Patch Changes

- [#419](https://github.com/ngrok-oss/mantle/pull/419) [`d78b2ce`](https://github.com/ngrok-oss/mantle/commit/d78b2ceb6bea4beca93358d7732117d7e97fb1bb) Thanks [@melanieseltzer](https://github.com/melanieseltzer)! - Make the `className` arg on `anchorClassNames` optional

## 0.19.11

### Patch Changes

- [#417](https://github.com/ngrok-oss/mantle/pull/417) [`298b175`](https://github.com/ngrok-oss/mantle/commit/298b1753231f89c8102d469d5d79b6492364a9d8) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - CodeBlock: adjust styles, add defensive css (for docs)

## 0.19.10

### Patch Changes

- [#415](https://github.com/ngrok-oss/mantle/pull/415) [`4275988`](https://github.com/ngrok-oss/mantle/commit/427598893d974cdbd27fea55bfe322ab437d7a48) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - mantle.css: improve matching for css vars on root

## 0.19.9

### Patch Changes

- [#413](https://github.com/ngrok-oss/mantle/pull/413) [`d42bb6f`](https://github.com/ngrok-oss/mantle/commit/d42bb6f7843060a84a363e5162b7d1cbedd59946) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - SelectItem: improve styling to fix hover bg color on selected items in docs use case

## 0.19.8

### Patch Changes

- [#411](https://github.com/ngrok-oss/mantle/pull/411) [`88727bd`](https://github.com/ngrok-oss/mantle/commit/88727bd71171ef05ca83dbd43bad1b2449464c2e) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - CodeBlock: add CodeBlockIcon component and fix some styling

## 0.19.7

### Patch Changes

- [#408](https://github.com/ngrok-oss/mantle/pull/408) [`0868adb`](https://github.com/ngrok-oss/mantle/commit/0868adbcf65936e0377236d353610e063a6279f7) Thanks [@melanieseltzer](https://github.com/melanieseltzer)! - Revamp the readme and contributing guide

- [#410](https://github.com/ngrok-oss/mantle/pull/410) [`de54a95`](https://github.com/ngrok-oss/mantle/commit/de54a953fcaf64344c652c5cc573515197e68555) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - add fade-in keyframes to tailwind preset

## 0.19.6

### Patch Changes

- [`1d83e1d`](https://github.com/ngrok-oss/mantle/commit/1d83e1df14d7848a7eb14de13699aac7d846dcc8) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Slack post will work this time for real i promise u 🦐

## 0.19.5

### Patch Changes

- [`595e6c1`](https://github.com/ngrok-oss/mantle/commit/595e6c1dc9758a68602492e270452891d3482f60) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Fixing the post to slack webhook on mantle release

## 0.19.4

### Patch Changes

- [`cf2d8c2`](https://github.com/ngrok-oss/mantle/commit/cf2d8c25e1f3525165e0510ae51dc9162a6439c8) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Debugging changesets release

## 0.19.3

### Patch Changes

- [#399](https://github.com/ngrok-oss/mantle/pull/399) [`cbeec74`](https://github.com/ngrok-oss/mantle/commit/cbeec7482e7b19fba9202d80e842a6785018728e) Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Update patch dependencies of radix component packages https://github.com/ngrok-oss/mantle/pull/396
  Improve code quality (suggestions from trialing biomejs) https://github.com/ngrok-oss/mantle/pull/398

  For historical release notes prior to `v0.19.3`, please consult https://github.com/ngrok-oss/mantle/releases
