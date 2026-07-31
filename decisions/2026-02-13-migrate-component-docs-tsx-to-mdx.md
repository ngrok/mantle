# Migrate Component Documentation Pages from TSX to MDX

## Goal

Convert legacy component documentation pages from handrolled `.tsx` route files to `.mdx` files. The MDX format is more readable, maintainable, and accessible to AI agents.

## Remaining Pages to Migrate

Check `apps/www/app/routes.ts` — any route using a direct `route()` call to a `./routes/components.*.tsx` file (not using `docRoute()`) still needs migration. Exclude `components.preview.*` files and `components._redirect.*` files — those are not documentation pages.

## Step-by-Step Migration Process

### 1. Create the MDX file

Create `apps/www/app/docs/components/<component-name>.mdx`.

Use this structure:

````mdx
---
title: Component Name
description: Brief description of the component.
---

import { Component } from "@ngrok/mantle/component";
import { Example } from "~/components/example";

# Component Name

Brief description of the component.

<Example>
	<Component.Root>{/* live interactive preview */}</Component.Root>
</Example>

```tsx
import { Component } from "@ngrok/mantle/component";

<Component.Root>{/* code snippet showing usage */}</Component.Root>;
```
````

## API Reference

### Component.Root

Description of the component.

All props from [element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/element#attributes), plus:

| Prop       | Type     | Default     | Description              |
| :--------- | :------- | :---------- | :----------------------- |
| `propName` | `string` | `"default"` | Description of the prop. |

````

### 2. Convert content from the TSX file

- **`PageHeader`** → Replace with a Markdown `# H1` heading.
- **`<Example>`** → Keep as-is, it works in MDX.
- **`CodeBlock.Root` / `CodeBlock.Body` / `CodeBlock.Code` with `fmtCode`** → Replace with a standard fenced code block (`` ```tsx ... ``` ``).
- **`PropsTable` / `PropRow` / `PropNameCell` / etc.** → Replace with a Markdown table. Columns: `Prop`, `Type`, `Default`, `Description`.
- **`HashLinkHeading`** → Replace with a standard Markdown heading (`## H2` or `### H3`). MDX auto-generates anchors by lowercasing and removing dots/special chars (e.g., `### Tooltip.Content` → `#tooltipcontent`).
- **`<Code>`** → Replace with inline backticks in Markdown.
- **Prose wrapped in `<p className="font-body text-body text-xl">`** → Replace with plain Markdown paragraphs.
- **`<section className="space-y-4">`** → Drop entirely; MDX handles spacing.

### 3. Handle interactive examples that need state

If an example needs `useState` or other hooks, define and export a wrapper component inside the MDX file:

```mdx
export function InteractiveDemo() {
	const [value, setValue] = useState(50);
	return (
		<Component value={value} onChange={setValue} />
	);
}

<Example>
	<InteractiveDemo />
</Example>
````

### 4. Update routing

In `apps/www/app/routes.ts`:

1. Add `...docRoute("components/<component-name>"),` to the `docRoute` section (keep alphabetical order).
2. Delete the old `route("components/<component-name>", "./routes/components.<component-name>.tsx")` line.

### 5. Delete the old TSX file

Delete `apps/www/app/routes/components.<component-name>.tsx`.

### 6. Update `@see` links in component source code

The old TSX pages used `#component-name` anchor format (e.g., `#tooltip-root`). MDX auto-generates anchors by lowercasing the heading text and removing `.` characters:

- `### Tooltip.Root` → `#tooltiproot`
- `### Tooltip.Content` → `#tooltipcontent`
- `### TooltipProvider` → `#tooltipprovider`

Find and update all `@see` JSDoc links in `packages/mantle/src/components/<component-name>/` to use the new anchor format.

**Single components** (e.g., `Button`, `Separator`) — link to the top-level URL with no hash:

```
@see https://mantle.ngrok.com/components/button
```

**Compound components** (e.g., `Tooltip.Root`, `Tooltip.Content`) — use the new MDX anchor format (lowercase, no dots):

```
# Old format:
@see https://mantle.ngrok.com/components/tooltip#tooltip-root

# New format:
@see https://mantle.ngrok.com/components/tooltip#tooltiproot
```

If a component source file has a general `@see` pointing to `#api` or `#api-reference`, update it to `#api-reference`.

### 7. Verify

Run from the workspace root:

```bash
pnpm -w run lint
pnpm -w run fmt:check    # run `pnpm -w run fmt` to auto-fix
pnpm -w run typecheck
pnpm -w run start        # manually verify the page renders correctly
```

## Formatting Rules

- Use **tabs** for indentation (project standard).
- Use **double quotes** for JSX attribute values.
- Props table types: wrap in backticks (`` `string` ``), use `\|` for union types in table cells.
- Mark optional props with `?` suffix on the prop name (e.g., `` `side?` ``).
- If a prop has no default, leave the Default column empty.
- "All props from [element](...)" links go to MDN.

## Gotchas

- **`fmtCode` tagged template literals**: Only the old TSX `CodeBlock.Code` components use these. In MDX, replace with a standard fenced code block. Do NOT import or use `fmtCode`.
- **Duplicate IDs in examples**: If multiple examples render the same component with `id` props, make sure each `id` is unique across the entire page to avoid React warnings.
- **Controlled input warnings**: If a static example passes `checked` or `value` with no `onChange` handler, it needs a `readOnly` prop.
- **`asChild` prop**: Many components support `asChild`. When the source component type includes it, document it in the props table.
- **Dialog/Sheet autofill handling**: For overlay components (Dialog, Sheet), document the `onPointerDownOutside` + `isDialogOverlayTarget` pattern to prevent password managers from closing them.
- **Code Block page**: This migration excludes it because its examples are JSX-heavy and dynamic. Skip it for now.
