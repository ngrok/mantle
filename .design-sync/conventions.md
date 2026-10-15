# Mantle: how to build with it

Mantle is ngrok's React design system. Every component and icon is a property of `window.Mantle` (or a named import from `@ngrok/mantle`). Styling is Tailwind utility classes on Mantle's semantic tokens, precompiled into `styles.css`. **There is no Tailwind compiler at runtime**, so only the classes listed below (and the classes Mantle's own components use) exist. Arbitrary values such as `w-[340px]` or `bg-[#123]` silently do nothing.

## Setup

- No wrapper is required for the light theme: tokens apply on `:root`.
- Dark theme: put `class="dark"` on `<html>`. Other themes are `light-high-contrast` and `dark-high-contrast`. To flip one subtree to the opposite theme, add the `invert-theme` class.
- `Tooltip` throws outside a provider. Wrap the app (or the tooltip) in `TooltipProvider`.
- Toasts: mount one `Toaster` and call `makeToast(...)`, or compose `Toast.Root` inline.
- Compound components are flat namespaces, and the outer part is always `Root`: `Dialog.Root`, `Dialog.Content`, `Dialog.Header`, `Dialog.Title`, `Dialog.Body`, `Dialog.Footer`.
- `Button` and `IconButton` **require** `appearance` (`filled | outlined | ghost | link`) and `intent` (`neutral | accent | danger`). The primary action is `appearance="filled" intent="neutral"`. Use `accent` only for deliberate brand emphasis. `IconButton` also requires `label` and `icon`.
- Icons are Phosphor components on `window.Mantle`, named `<Name>Icon`: `PlusIcon`, `GearIcon`, `TrashSimpleIcon`, `MagnifyingGlassIcon`, `GlobeIcon`, `CaretDownIcon`, `CopyIcon`, `CheckCircleIcon`, `WarningIcon`, `InfoIcon`, `UserIcon`, `ChartLineIcon`, and about 120 more. Pass them as elements: `icon={<PlusIcon />}`, `<Icon svg={<GlobeIcon />} />`.

## Styling vocabulary

| Purpose      | Classes                                                                                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Surfaces     | `bg-base`, `bg-card`, `bg-dialog`, `bg-popover`, `bg-form`, `hover:bg-card-hover`                                                                                                                                                          |
| Text         | `text-strong` (headings), `text-body` (default), `text-muted` (secondary), `text-placeholder`                                                                                                                                              |
| Borders      | `border border-card`, `border-base`, `border-form`, `divide-y divide-card`                                                                                                                                                                 |
| Intent ramps | `{bg,text,border}-{accent,danger,success,warning,info,important,neutral}-{50…950}`, for example `bg-success-500`, `text-danger-600`                                                                                                        |
| Filled fills | `bg-filled-accent`, `bg-filled-danger`, `bg-filled-success`, `bg-filled-warning`, `text-on-filled`                                                                                                                                         |
| Type         | `text-xs` … `text-5xl`, `font-sans`, `font-mono`, `font-medium`, `font-semibold`, `tabular-nums`, `truncate`                                                                                                                               |
| Layout       | `flex`, `grid`, `grid-cols-{1-12}`, `gap-{0-24}`, `p-*`, `px-*`, `py-*`, `m-*`, `w-full`, `w-{4-96}`, `max-w-{xs…7xl}`, `size-*`, `rounded-{sm,md,lg,xl,full}`, `shadow-{sm,md,lg}`, plus `sm:` / `md:` / `lg:` prefixes on layout classes |

Prefer the semantic tokens (`bg-card`, `text-muted`, `border-card`) over raw palette colors. They follow the active theme.

## Where to look

- `styles.css` imports `_ds_bundle.css`, which holds every compiled class. Search it before you use a class you have not seen above.
- `components/<group>/<Name>/<Name>.prompt.md` is each component's usage guide. `<Name>.d.ts` is its props contract. Read both before you use a component.

## Example

```jsx
const { Card, Badge, Button, Field, Input, PlusIcon } = window.Mantle;

<Card.Root className="max-w-xl">
	<Card.Header className="flex items-center justify-between">
		<Card.Title>Endpoints</Card.Title>
		<Badge appearance="muted" color="success">
			3 online
		</Badge>
	</Card.Header>
	<Card.Body className="flex flex-col gap-4">
		<Field.Item name="domain">
			<Field.Label>Domain</Field.Label>
			<Field.Control>
				<Input placeholder="api.example.com" />
			</Field.Control>
			<Field.Description className="text-muted">Agents connect to this URL.</Field.Description>
		</Field.Item>
		<div className="flex justify-end gap-2">
			<Button appearance="outlined" intent="neutral">
				Cancel
			</Button>
			<Button appearance="filled" intent="neutral" icon={<PlusIcon />}>
				Create endpoint
			</Button>
		</div>
	</Card.Body>
</Card.Root>;
```
