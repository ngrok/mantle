---
"@ngrok/mantle": minor
---

feat(mantle): add `List` component

`List` is a scrollable list of **clickable** items — the action / navigation
counterpart to `SelectableList`. Compose `List.Item`s inside a `List.Viewport`;
each is a `<button>` (`onClick`) by default or your own element via `asChild`
(e.g. an `<a>` for navigation), with an optional `selected` accent. Suits
account switchers, SSO provider pickers.

```tsx
import { List } from "@ngrok/mantle/list";

<List.Viewport aria-label="Your accounts" className="max-h-80">
	{accounts.map((account) => (
		<List.Item key={account.id} onClick={() => switchTo(account.id)}>
			<List.ItemTitle>{account.name}</List.ItemTitle>
			<List.ItemDescription>
				{account.plan} · {account.memberCount} members
			</List.ItemDescription>
		</List.Item>
	))}
</List.Viewport>;
```

- A **non-selecting** semantic list: `role="list"` of `role="listitem"` items,
  styled like the `MultiSelect` popover (bordered, rounded `bg-popover`; items
  highlight on hover / selection with an inset, rounded pill).
- **Non-virtualized by default.** Swap `Viewport` → `VirtualViewport` (same
  `Item` children) to window long lists. `@tanstack/react-virtual` ships with
  both list entrypoints; it is small — a few kB gzipped — and does no windowing
  work until a `VirtualViewport` renders.
- `Item` supports `asChild` for link/navigation items, `selected`, and
  `disabled`. `selected` sets `aria-current`, so the selected/current item is
  announced, not just tinted. A disabled `asChild` item carries `aria-disabled`,
  is removed from the tab order, and swallows clicks/activation — though
  consumers should prefer omitting the `href` for a genuinely disabled link.
- Built on a shared internal list primitive (the scroll + item chrome and ARIA
  wiring behind both `List` and `SelectableList`); the primitive itself is
  deliberately not exported.
- **Keyboard.** Items keep their native tab order, and `Arrow`↑/`Arrow`↓ /
  `Home` / `End` also move focus between items (skipping disabled ones, no
  wrap); the focused item lights up with the hover tint instead of a focus ring
  on the control. Arrow navigation spans a `VirtualViewport`'s full list — jump
  targets are scrolled into view and mounted before focus moves — though
  off-screen items still aren't Tab-reachable (the windowing trade-off).
