---
"@ngrok/mantle": minor
---

feat(mantle): add `ScrollableList` preview component

`ScrollableList` is a virtualized, scrollable list of **clickable** rows — the
action / navigation counterpart to `SelectableList`. Compose
`ScrollableList.Item` rows directly; each is a `<button>` (`onClick`) by default
or your own element via `asChild` (e.g. an `<a>` for navigation), with an
optional `selected` accent. Built for long lists (account switchers, SSO
provider pickers).

```tsx
import { ScrollableList } from "@ngrok/mantle/scrollable-list";

<ScrollableList.Root aria-label="Your accounts" className="max-h-80">
	{accounts.map((account) => (
		<ScrollableList.Item key={account.id} onClick={() => switchTo(account.id)}>
			<ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
			<ScrollableList.ItemDescription>
				{account.plan} · {account.memberCount} members
			</ScrollableList.ItemDescription>
		</ScrollableList.Item>
	))}
</ScrollableList.Root>;
```

- Shares `SelectableList`'s look — styled like the `MultiSelect` popover
  (bordered, rounded `bg-popover` container; rows highlight on hover / selection
  with an inset, rounded pill, accent-tinted when selected) — via a shared
  internal `VirtualList` shell that both components are built on.
- `Item` supports `asChild` for link/navigation rows, `selected`, and `disabled`.
- **Preview / unstable API.** Bound the list's height for virtualization to
  engage; roving arrow-key navigation is a planned enhancement.
