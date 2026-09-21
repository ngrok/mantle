---
"@ngrok/mantle": minor
---

**Breaking: `Tabs.List` draws no border.** The `hideBorder` prop and the `data-hide-border` attribute are gone, and so is the side border of a vertical classic list. The new `Tabs.Separator` part draws the hairline instead. Compose it directly after `Tabs.List`:

```tsx
<Tabs.Root defaultValue="account">
	<Tabs.List>
		<Tabs.Trigger value="account">Account</Tabs.Trigger>
		<Tabs.Trigger value="password">Password</Tabs.Trigger>
	</Tabs.List>
	<Tabs.Separator />
	<Tabs.Content value="account">…</Tabs.Content>
	<Tabs.Content value="password">…</Tabs.Content>
</Tabs.Root>
```

Why: a horizontal list is a scroll container, and it carries negative margins and padding so the focus ring has room. A border painted on the list itself had to live inside that padding, so it stopped short of the root's edges and faded with the triggers under the scroll mask. The separator is a sibling of the list, so it spans the root's full width, never scrolls, and never fades.

`Tabs.Separator` composes the mantle `Separator`. It paints the `separator` color token, follows the root's `orientation` (under the list when horizontal, beside the list when vertical), is decorative by default (`role="none"`), and accepts `semantic` and `asChild`. It stamps `data-slot="tabs-separator"`, `data-orientation`, and `data-separator`. As the root's direct child it pulls itself up by the new `--tabs-gap` CSS variable and sits flush against the list while the content keeps the gap. Inside a wrapper of your own, the offset stays off.

`Tabs.Root` now sets `--tabs-gap` (default `1rem`) and reads it for its `gap`. Set the variable, not a `gap-*` class, to change the space between the list and the content. A `gap-*` class changes the gap alone and leaves the separator's offset at `1rem`.

Migrate:

- Add `<Tabs.Separator />` after every classic `Tabs.List` that relied on the default border. A pill list never drew one.
- Delete `hideBorder` from every `Tabs.List`. A list that had `hideBorder` needs no separator.
- Replace a `[data-hide-border]` selector with a `[data-slot="tabs-separator"]` selector, or with its absence.
- On a `Tabs.Root` that holds a `Tabs.Separator` as a direct child, replace a `gap-*` class with `[--tabs-gap:…]`.

Migration guide: https://mantle.ngrok.com/migrations/0008-tabs-separator-migration

API reference: https://mantle.ngrok.com/components/navigation/tabs#tabsseparator
