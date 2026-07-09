---
description: "Scaffold a new mantle component (files, docs, route, nav, changeset). Accepts PascalCase, Title Case, lowercase, or kebab-case names."
argument-hint: "<component-name>"
---

# Scaffold a new mantle component

Scaffold a new component named `$ARGUMENTS` in the mantle design system. If no name is provided, ask the user for a component name.

## 0.a. Ask: compound or simple?

After normalizing the name (step 0), ask the user:

> Is `<ComponentName>` a compound component (a POJO namespace with multiple sub-parts, e.g. `<ComponentName>.Root`, `<ComponentName>.Content`, etc.) or a simple single-element component?

If compound, ask a follow-up:

> What are the sub-parts that compose the export, and how do they nest? (e.g. `Root > Header > Title + Body + Footer`)

Use this structural answer in step 1 below (and in step 3) to build the ASCII composition tree used in the namespace JSDoc and in the docs page's `## Composition` section. Tree format:

```
<ComponentName>.Root
├── <ComponentName>.Header
│   └── <ComponentName>.Title
├── <ComponentName>.Body
└── <ComponentName>.Footer
```

Use real Unicode box-drawing chars (`├` U+251C, `─` U+2500, `└` U+2514, `│` U+2502) and 4-char per-level indentation.

## 0. Normalize the component name

The user may provide the name in any of the following formats. Accept all of them and normalize before scaffolding:

- `ComponentName` (PascalCase)
- `Component Name` (Title Case with spaces)
- `component name` (lowercase with spaces)
- `component-name` (kebab-case)

Derive two canonical forms from the input and use them consistently throughout the rest of these steps:

- **`<component-name>`** — lower-kebab-case. Used for file names, directory names, package.json export keys, route paths, URL slugs, and import specifiers. Example: `my-component`.
- **`<ComponentName>`** — PascalCase. Used for the exported React component / namespace identifier, TypeScript types, and the displayed documentation title. Example: `MyComponent`.

A `<Display Name>` (Title Case with spaces, e.g. `My Component`) is also needed for the navigation label in step 5 — derive it from the PascalCase form by inserting spaces before internal capital letters.

Examples of normalization:

| Input          | `<component-name>` | `<ComponentName>` | `<Display Name>` |
| -------------- | ------------------ | ----------------- | ---------------- |
| `ButtonGroup`  | `button-group`     | `ButtonGroup`     | `Button Group`   |
| `Button Group` | `button-group`     | `ButtonGroup`     | `Button Group`   |
| `button group` | `button-group`     | `ButtonGroup`     | `Button Group`   |
| `button-group` | `button-group`     | `ButtonGroup`     | `Button Group`   |

Follow these steps exactly:

## 1. Create the component directory and files

Create `packages/mantle/src/components/<component-name>/` with:

### `<component-name>.tsx`

- Import `cx` from `../../utils/cx/cx.js`
- Use `ComponentProps` from React for prop types (no `interface`, use `type`)
- Add JSDoc comments on all exported components with `@see` linking to `https://mantle.ngrok.com/components/<component-name>` and `@example` blocks
- Use named exports (no default exports)
- **Add a `data-slot` attribute to the rendered root element of every component** (applies to both simple and compound components, and to every sub-part of a compound component). Use kebab-case:
  - Simple component: `data-slot="<component-name>"` (e.g., `data-slot="main"`)
  - Compound root: `data-slot="<component-name>"` (e.g., `data-slot="code-block"`)
  - Compound sub-part: `data-slot="<component-name>-<sub-part>"` (e.g., `data-slot="code-block-header"`, `data-slot="empty-title"`)

  `data-slot` attributes give consumers a stable, styling-friendly hook that survives className overrides and `asChild` swaps. See `multi-select.tsx`, `empty.tsx`, and `code-block.tsx` for examples.

#### Compound component pattern (POJO namespace)

If the component has sub-parts, follow the POJO namespace pattern from `decisions/2025-07-16-compound-component-named-exports.md`:

- Define each sub-component as a standalone const (e.g., `Root`, `Content`, `Title`)
- Set `displayName` on each sub-component using the **original flat name** for React DevTools debugging:
  ```tsx
  Root.displayName = "MyComponent";
  Content.displayName = "MyComponentContent";
  Title.displayName = "MyComponentTitle";
  ```
- The JSDoc on the **top-level namespace declaration** (the `const MyComponent = {` line) MUST include a `Composition` ASCII-tree `@example` as the **first** `@example` block, followed by the full-tree JSX usage `@example`. The tree uses Unicode box-drawing chars and 4-char per-level indentation. This tree is what consumers and LLMs see first when hovering the namespace in IntelliSense, and it is the single source of truth for the component's structural shape. Example:

  ````tsx
  /**
   * A brief description of the component.
   *
   * @see https://mantle.ngrok.com/components/my-component
   *
   * @example
   * Composition:
   * ```
   * MyComponent.Root
   * ├── MyComponent.Header
   * │   └── MyComponent.Title
   * ├── MyComponent.Body
   * └── MyComponent.Footer
   * ```
   *
   * @example
   * ```tsx
   * <MyComponent.Root>
   *   <MyComponent.Header>
   *     <MyComponent.Title>Title</MyComponent.Title>
   *   </MyComponent.Header>
   *   <MyComponent.Body>Body content</MyComponent.Body>
   * </MyComponent.Root>
   * ```
   */
  const MyComponent = { ... } as const;
  ````

  Update this tree whenever you add, remove, or rename a sub-part.

- Create the namespace object with `as const` and **inline JSDoc on every property**. Every property MUST have an `@example` block showing the **full component tree** (all commonly-used sub-parts), not an abbreviated snippet. The same full-tree example should be repeated across each property so any entry point in the docs/IntelliSense shows the whole usage shape. Variant sub-components (e.g. a tabs-enabled form of the same component) may use a distinct full-tree example that demonstrates that variant:

  ````tsx
  const MyComponent = {
  	/**
  	 * The root container of the component.
  	 *
  	 * @see https://mantle.ngrok.com/components/my-component
  	 *
  	 * @example
  	 * ```tsx
  	 * <MyComponent.Root>
  	 *   <MyComponent.Header>
  	 *     <MyComponent.Title>Title</MyComponent.Title>
  	 *   </MyComponent.Header>
  	 *   <MyComponent.Body>Body content</MyComponent.Body>
  	 * </MyComponent.Root>
  	 * ```
  	 */
  	Root,
  	/**
  	 * The title of the component.
  	 *
  	 * @see https://mantle.ngrok.com/components/my-component
  	 *
  	 * @example
  	 * ```tsx
  	 * <MyComponent.Root>
  	 *   <MyComponent.Header>
  	 *     <MyComponent.Title>Title</MyComponent.Title>
  	 *   </MyComponent.Header>
  	 *   <MyComponent.Body>Body content</MyComponent.Body>
  	 * </MyComponent.Root>
  	 * ```
  	 */
  	Title,
  } as const;
  ````

  The same rule applies to the JSDoc on the underlying `const Root = forwardRef(...)` / `const Title = (...) => ...` declarations — use full-tree `@example` blocks there too. See `alert.tsx`, `code-block.tsx`, and `empty.tsx` for the canonical pattern.

- Provider components and standalone utility functions stay as **separate named exports** alongside the namespace object (see the Toast/Toaster pattern in the decisions doc).

#### `asChild` support

**All components and compound sub-parts should support the `asChild` prop by default.** Every component has an ideal default DOM element it renders as, but consumers must also be able to swap that element for their own component or a different tag when composition requires it — that's what `asChild` is for. Only skip `asChild` when there is a concrete reason the polymorphism doesn't apply (examples below).

To add `asChild` support:

- Import `WithAsChild` from `../../types/as-child.js` and `Slot` from `../slot/index.js`
- Add `asChild` to the props type: `ComponentProps<"div"> & WithAsChild` (or the appropriate element)
- Swap the rendered element:
  ```tsx
  const Comp = asChild ? Slot : "div";
  return <Comp data-slot="my-component" className={cx(...)} {...props} />;
  ```
- Document the polymorphism in the docs page under a `## Polymorphism` section (see step 3).

**Exceptions — when NOT to add `asChild`:**

- The component accepts an element via a prop rather than children and clones it internally (e.g., `Empty.Icon` takes an `svg` prop and uses `SvgOnly` to clone it — polymorphism is already handled via the prop).
- The component is a pure utility that does not render a DOM element (e.g., `BrowserOnly`, `Slot` itself, `SandboxedOnClick`).
- The component wraps a third-party primitive (Radix, Ariakit) that already exposes its own `asChild` / `render` mechanism, in which case forward to that primitive's escape hatch instead of re-implementing with `Slot`.

If you skip `asChild`, document why in a short comment at the component declaration so future maintainers know it was a deliberate exception, not an oversight.

See `alert.tsx`, `empty.tsx`, and `code-block.tsx` for canonical examples.

#### Simple (non-compound) components

For components without sub-parts, export a single named component directly — no namespace needed.

### `index.ts`

- Re-export everything from `./<component-name>.js` (note the `.js` extension)

## 2. Add the package.json export

Add an entry to `packages/mantle/package.json` under `"exports"` in alphabetical order:

```json
"./<component-name>": {
	"@ngrok/src-live-types": "./src/components/<component-name>/index.ts",
	"types": "./dist/<component-name>.d.ts",
	"import": "./dist/<component-name>.js"
}
```

Note: the build system (tsdown) auto-discovers component directories, so no tsdown config changes are needed.

## 3. Create the docs page

Create `apps/www/app/docs/components/<component-name>.mdx` with:

```mdx
---
title: <ComponentName>
description: <One-line description>
---

import { <ComponentName> } from "@ngrok/mantle/<component-name>";
import { Example } from "~/components/example";

# <ComponentName>

<Description>

<Example>
	<!-- Live interactive example -->
</Example>

\`\`\`tsx
import { <ComponentName> } from "@ngrok/mantle/<component-name>";

// Code snippet matching the example
\`\`\`

## Composition

Compose the parts of a `<ComponentName>` together to build your own:

\`\`\`text showLineNumbers=false

<ComponentName>.Root
├── <ComponentName>.Header
│   └── <ComponentName>.Title
├── <ComponentName>.Body
└── <ComponentName>.Footer
\`\`\`

## API Reference

### <ComponentName>

<Description of the component and its props>
```

For compound components, include a `## Composition` section (as shown above) before `## API Reference` with an ASCII tree showing how the parts nest. Use a `text showLineNumbers=false` fence so the tree renders as plain copy-friendly art. Use real Unicode chars (`├` `─` `└` `│`) and 4-char per-level indentation. The tree here should match the one in the top-level namespace JSDoc.

For simple components with no sub-parts, omit the `## Composition` section — there is no tree to draw.

If the component uses `asChild` to render as a different element, add a `## Polymorphism` section (after Composition, before API Reference) documenting that behavior — do **not** call this section "Composition" since that name is reserved for the structural tree above.

Icons in examples should use `@phosphor-icons/react` (the primary icon library for mantle).

## 4. Register the route

Add to `apps/www/app/routes.ts` in alphabetical order among the component docs:

```ts
...docRoute("components/<component-name>"),
```

## 5. Add to navigation

In `apps/www/app/components/layout.tsx`:

1. Add the display name to the `prodReadyComponents` array (alphabetical order)
2. Add the route mapping to `prodReadyComponentRouteLookup` (alphabetical order):
   ```ts
   "<Display Name>": "/components/<component-name>",
   ```

## 6. Verify

Run these commands and ensure they pass:

1. `pnpm -w run build -F @ngrok/mantle`
2. `pnpm -w run typecheck`
3. `pnpm -w run lint`
4. `pnpm -w run fmt:check` (run `pnpm -w run fmt` to auto-fix if needed)

## 7. Create a changeset

Create a changeset for the new component:

```bash
# or create manually at .changeset/<descriptive-name>.md
pnpm -w run changeset
```

The changeset should be a `minor` bump for `@ngrok/mantle` since a new component is a new feature.

## Reference

- `decisions/2025-07-16-compound-component-named-exports.md` — Full rationale and migration examples of the compound component POJO namespace pattern.
- `CONVENTIONS.md` — All code style, formatting, and TypeScript conventions. Follow it.
- Existing components like `empty`, `alert`, `dialog`, `card` — Real-world examples of the patterns above.
