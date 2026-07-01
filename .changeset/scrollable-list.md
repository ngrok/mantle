---
"@ngrok/mantle": minor
---

feat(mantle): add `ScrollableList` component

`ScrollableList` is a scrollable list of **clickable** rows — the action /
navigation counterpart to `SelectableList`. Compose `ScrollableList.Item` rows
inside a `ScrollableList.Viewport`; each is a `<button>` (`onClick`) by default
or your own element via `asChild` (e.g. an `<a>` for navigation), with an
optional `selected` accent. Suits account switchers, SSO provider pickers.

```tsx
import { ScrollableList } from "@ngrok/mantle/scrollable-list";

<ScrollableList.Viewport aria-label="Your accounts" className="max-h-80">
	{accounts.map((account) => (
		<ScrollableList.Item key={account.id} onClick={() => switchTo(account.id)}>
			<ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
			<ScrollableList.ItemDescription>
				{account.plan} · {account.memberCount} members
			</ScrollableList.ItemDescription>
		</ScrollableList.Item>
	))}
</ScrollableList.Viewport>;
```

- A **non-selecting** semantic list: `role="list"` of `role="listitem"` rows,
  styled like the `MultiSelect` popover (bordered, rounded `bg-popover`; rows
  highlight on hover / selection with an inset, rounded pill).
- **Non-virtualized by default.** Swap `Viewport` → `VirtualViewport` (same
  `Item` children) to window long lists; `@tanstack/react-virtual` is only
  pulled in when `VirtualViewport` is used.
- `Item` supports `asChild` for link/navigation rows, `selected`, and `disabled`.
- Built on a shared internal `list` primitive (the scroll + row chrome and ARIA
  behind both list components).
- Keyboard is the native tab order; under `VirtualViewport`, off-screen rows
  aren't Tab-reachable (the windowing trade-off).
