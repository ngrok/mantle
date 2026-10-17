# Browser Translation

Read this file before you change JSX that renders text beside an element, in `packages/` or `apps/`. [COMPONENT_SPEC.md §3.8](../COMPONENT_SPEC.md#38-browser-translation) adds the rules for a part.

A browser translation engine rewrites the DOM under React. Google Translate wraps each text node in a `<font>`
and reparents the original node, so React's reference points at a node its parent no longer owns. Three rules
follow, and all three bind `packages/` and `apps/` alike. The mechanism, the update-by-update table of what
breaks, and the rejected alternatives are in
[`decisions/2026-08-04-translation-safe-label-wrappers.md`](../decisions/2026-08-04-translation-safe-label-wrappers.md).

## Never render a conditional element immediately before bare text children

```tsx
// ❌ when `icon` appears, React inserts it before a reparented text node, and the DOM raises `NotFoundError`
<button>
	{icon && <Icon svg={icon} />}
	{children}
</button>

// ✅ the icon inserts before an element sibling
<button>
	{icon && <Icon svg={icon} />}
	<span data-slot="button-label">{children}</span>
</button>
```

React re-throws the raw `DOMException`, so the root tears down and the page goes blank. `Button` hit this on
the first click of every submit button, because `isLoading` synthesizes the icon.

Three fixes work, and the conditional element decides which one:

- **Wrap the text in an element.** The wrapper carries its own `data-slot` — `button-label`, `badge-label`,
  `anchor-label` — so a consumer can find the label. Give it `display: contents` inside a flex container,
  because a wrapper that lays out a box takes every child out of the parent's `gap`.
- **Move the element after the text.** The mount becomes an `appendChild`, which is safe. Prefer this for a
  decorative element that sits out of flow, because it adds no DOM (`DataTable.ActionHeader`). It cures the
  mount and nothing else, so text that can still unmount or swap to an element takes a wrapper as well.
- **Mount the element unconditionally and write text into it.** A `textContent` write is safe and self-healing, because
  it wipes the `<font>`. Prefer this for an `sr-only` announcer, which costs no layout
  (`DataTable.HeaderSortButton`).

A lone string, number, or `bigint` child is already safe: React writes it through `setTextContent`,
which repairs the subtree. The failure needs a sibling. A component element that returns bare text at its root is not that
lone child, because the component owns no host node and React mounts the text node by itself.

A parent with no host node of its own is the exception. A portal, a `Fragment`, and an array all lack one.
React then removes each of their children from the DOM one at a time, so a bare text child there throws on
unmount with no sibling in play. Wrap what you portal. Wrap the text children of a `Fragment` or an array too.
`Select.Item` wraps the label Radix portals into the trigger for this reason.

A reorder needs the same wrapper. React inserts a moved element before the next host sibling. That walk
returns a text node as readily as an element, so a keyed list that re-sorts in front of a bare text summary
throws.

## Never render a permanent element beside a consumer's children

The rule above covers the element that appears. A permanent one is worse, because it voids the guarantee the
lone-child row publishes and then waits:

```tsx
// ❌ the caret is always there, so `children` are never a lone child
<button>
	{children}
	<CaretRightIcon />
</button>

// ✅ the consumer's own swap now names an element
<button>
	<span data-slot="menu-item-label">{children}</span>
	<CaretRightIcon />
</button>
```

Without the caret, React writes `children` through `setTextContent` and repairs the `<font>` on every update.
With the caret, React creates a real text node instead. The consumer then swaps their own child from a string
to an element, follows every rule on this page, and still gets a blank page.

So when a component renders anything beside the `children` it receives, wrap those children. An icon, an
indicator, a caret, a checkmark, a portal, and a sibling that CSS hides all count. The wrapper carries its own
`data-slot`, which is public API from its first release.

A wrapper is a new child, so read the parent's CSS before you add one. `:nth-child`, `:first-child`,
`:last-child`, `has-[… :first-child]`, and a `[&>…]` child combinator all shift under it. `Input`,
`SplitButton`, and `Sidebar.SwitcherTrigger` carry selectors of that kind today. Widen every one of them in
the same edit.

## Mark untranslatable content `translate="no"`

A reader copies or retypes some strings: code, a CLI flag, an env var, a YAML key, a shortcut key, a filename,
an ID, a one-time passcode. A translated one is wrong, and the reader uses it anyway. Set
[`translate="no"`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/translate) on
the element that holds the string. Reach for the part that already owns the attribute before a raw one:
`Code`, `Kbd`, `CodeBlock.Code`, `CodeBlock.Title`, `Command.Shortcut`, `DropdownMenu.Shortcut`, and
`OtpInput.Slot`.

The attribute classifies content. It is never the fix for a crash. Descendants inherit it, so the engine skips
the subtree and a crash shape under it stops throwing, but the shape stays: the next prose child, or the next
call site without the attribute, hits it. When a shape from the two rules above throws, fix the structure (wrap
the text, move the element, or keep the element mounted), and set `translate="no"` only when the content also
belongs on the list above. A search query, a name, a status label, and any other prose stay translatable.

When the element can never hold prose, lock the attribute. Omit `translate` from the props type, and stamp it
**after** the props spread, so a wider props object cannot carry a value past the type either:

```tsx
function Kbd({ children, ...props }: Omit<ComponentProps<"kbd">, "translate">) {
	return (
		<kbd
			{...props}
			// Why after the spread: a wider props object can still carry `translate`
			// past the type, and a translated shortcut key names the wrong key.
			translate="no"
		>
			{children}
		</kbd>
	);
}
```

`Kbd`, `CodeBlock.Code`, and `OtpInput.Slot` lock it. Keep the prop when the element can hold prose, so
`translate="no"` reads as a default: `Code` also styles terms that are not code, and a `CodeBlock.Title` is
not always a filename.
