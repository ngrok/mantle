# Wrap bare text children so a browser translation engine cannot crash the page

**Date:** 2026-08-04
**Status:** Accepted
**Applies to:** `@ngrok/mantle/button`, `@ngrok/mantle/badge`, `@ngrok/mantle/anchor`, `@ngrok/mantle/data-table`, and every future part that renders a conditional element beside bare text children
**Issue:** [ngrok/mantle#1407](https://github.com/ngrok/mantle/issues/1407)

## Context

On a page that a browser translation engine has translated, `Button` threw as
soon as `isLoading` turned on:

```
DOMException: Failed to execute 'insertBefore' on 'Node': The node before which
the new node is to be inserted is not a child of this node.
```

React re-throws the raw `DOMException`. Without an error boundary above the
button, the React root tears down. The page then goes blank. `Badge`, `Anchor`,
`DataTable.HeaderSortButton`, and `DataTable.ActionHeader` shared the shape and
the failure.

### The mechanism

Google Translate wraps each text node in a `<font style="vertical-align:
inherit;">`. It **reparents** the original text node: React's reference to it
stays alive, but its parent is now the `<font>` rather than the element React
rendered it into.

Every affected component rendered a conditional element immediately before bare
`{children}`:

```tsx
{icon && <Icon svg={icon} … />}
{children}
```

When `icon` appears, React inserts it before the children text node — it calls
`button.insertBefore(icon, childrenTextNode)`. That text node is no longer a
child of the button, so the DOM raises `NotFoundError`.

`isLoading` is what made this fire on ordinary use, because `Button` synthesizes
the icon from it. The first click of any submit button threw before the loading
state could render. `iconPlacement="end"` did not help: that placement is CSS
`order-last`, so the DOM order is unchanged.

### What the mutation does and does not break

The failure needs React to insert before, or remove, a **text** node that
translation reparented:

| Update                                          | Result                                  |
| ----------------------------------------------- | --------------------------------------- |
| Insert an element before a translated text node | Throws                                  |
| Remove a text child while siblings remain       | Throws                                  |
| A text child changes type to an element         | Throws                                  |
| Change a text child's value                     | Safe. The translation reverts.          |
| Reorder or remove **element** children          | Safe. Elements are never reparented.    |
| **Append** after a translated text node         | Safe.                                   |
| Unmount the whole subtree                       | Safe. React removes the outermost node. |
| A **lone** expression child                     | Safe, and self-healing.                 |

The last row is the one to design toward. When `children` is the only child of a
host element, React updates it through `setTextContent`, which falls back to
`node.textContent = text` whenever the first child is not a text node. That
write wipes the `<font>` wrapper and repairs the subtree instead of fighting it.

## Decisions

### 1. A component's text children get a stable element wrapper

`Button`, `Badge`, and `Anchor` wrap `children` in a span carrying a
`data-slot`, so a newly-appearing icon inserts before an **element** sibling:

```tsx
{icon && <Icon svg={icon} … />}
<span data-slot="button-label">{children}</span>
```

The slot names are `button-label`, `badge-label`, and `anchor-label`. Each is
public API — a consumer may target it to style the label, for example to clamp a
long one with `min-w-0 truncate`. `Select.Item` was already the precedent in the
library: it has the identical `{icon && …}` shape but wraps children in
`SelectPrimitive.ItemText`, so it never threw.

Both the plain and the `asChild` path wrap, because both render the same shape.

### 2. The label is one flex item. Pass an icon through `icon`, not as a child

`Button` and `Badge` are flex containers, and bare text children were an
anonymous flex item. A real span is one flex item too, so a single-child button
lays out identically — but multiple children now share one item, and the
container's `gap` no longer falls between them.

This is the trade-off the decision accepts, and it points call sites at the API
that was always intended: `<Button icon={<PlusIcon />}>Create endpoint</Button>`,
never `<Button><PlusIcon />Create endpoint</Button>`. A call site that keeps a
trailing hint as a child owns its own spacing.

We considered a `display: contents` wrapper, which would preserve the flex
structure exactly. We rejected it: it makes the new `data-slot` unstylable,
which defeats half the reason to name it.

### 3. An always-mounted announcer takes a lone string child

Wrapping a component's own children does not help a part that renders a
conditional element beside children it received. `DataTable.HeaderSortButton`
mounted its screen-reader sort announcement only while sorted, immediately before
the header label, so the first click on any sortable column threw.

That announcer is now always mounted and takes a single computed string from the
pure `sortStateAnnouncement` function — an empty string when the column is
unsorted. Every sort change is then a `textContent` write, which is both safe and
self-healing. The announcer is `sr-only`, so it is absolutely positioned and
never a flex item; mounting it unconditionally costs no layout.

### 4. A decorative, absolutely positioned sibling moves after children

`DataTable.ActionHeader` mounted its sticky-column indicator before `children`
once the table had rows, so a table loading its first page threw. The indicator
is `aria-hidden`, `pointer-events-none`, and absolutely positioned outside the
cell's content box, so DOM order buys nothing there. Rendering it last turns the
mount into an `appendChild`.

Prefer this over a wrapper when the conditional element is decorative and
out of flow. It adds no DOM.

## Consequences

- Consumer CSS that targeted a button's, badge's, or anchor's text through a
  structural selector may need the new `data-slot` instead.
- The pattern to avoid is now nameable in review: **never render a conditional
  element immediately before bare text children.** Wrap the text, move the
  element after it, or mount the element unconditionally.
- `IconButton` needed no change. Both its children are always mounted, and its
  `sr-only` label already takes a lone string child.

## Caveats

The regression tests reproduce the mutation in happy-dom. A hand check confirms
Chromium matches on all three counts: `insertBefore` and `removeChild` both raise
`NotFoundError` against a reparented text node, and a `textContent` write removes
the `<font>` wrapper. The sortable `DataTable` header also sorts twice with no
page error against a translated DOM.

The model is a reparent, which is what Google Translate does. An engine that
instead detaches and replaces the text node would produce a different symptom.
Safari and Firefox translation are unverified.
