---
name: browser-translation-hazards
description: 'Find the JSX shapes that crash a page a browser translation engine has rewritten, and leave the safe ones alone. Use when auditing or reviewing a component for translation safety, when adding a label wrapper or a translate="no" attribute, and when a page goes blank with a NotFoundError DOMException. Skip it for ordinary rendering bugs.'
---

# Browser translation hazards

[CONVENTIONS.md § Browser Translation](../../../CONVENTIONS.md#browser-translation) holds the three rules,
[COMPONENT_SPEC.md §3.8](../../../COMPONENT_SPEC.md#38-browser-translation) holds what they mean for a part, and
[the docs page](../../../apps/www/app/docs/browser-translation.mdx) holds the mechanism table. This file is only
how an auditor applies them: what to flag, what to leave, and what no tool can see.

Over-fixing is the failure mode this file exists to prevent. Every wrapper is a DOM change and a public
`data-slot`, so a wrapper added to a safe shape costs a release and buys nothing.

## The six shapes to flag

Each one needs a **reparented text node** and an **update that names it**. Both halves, or there is no defect.

1. A conditional element renders immediately before bare text. React inserts before the text node.
2. A bare text child unmounts while an element sibling stays mounted. React removes the text node.
3. A child flips between a string and an element while a sibling stays mounted. React removes, then inserts.
4. A keyed list re-sorts in front of bare text. React inserts each moved element before the next host sibling,
   and that walk returns a text node as readily as an element.
5. A portal, a keyed `Fragment`, an array, or a component that returns bare text at its root holds that text
   directly. None of the four owns a host node, so React removes each child by itself.
6. **Any unconditional element renders beside the `children` a part receives.** This is the one a review
   misses. The sibling takes those children off React's `setTextContent` repair path, so the consumer's own
   later swap throws in code the part's author never sees.

## Safe shapes to leave alone

- **A lone string or number child of a host element.** React writes it through `setTextContent`, which wipes
  the `<font>` and heals the subtree. This is the shape to design toward.
- **A child list that never changes**, however long it is, and however much bare text it holds.
- **An element child that unmounts.** An engine never reparents an element.
- **An element that mounts _after_ the text.** The mount is an `appendChild`.
- **A subtree that owns a host node and unmounts whole.** React removes that one node.
- **Anything under `translate="no"`.** The engine never enters the subtree, so it reparents nothing. Check the
  ancestors before flagging a descendant.
- **A part that renders only its own authored text beside a sibling.** No consumer swaps it, so there is no
  update to throw on. Shape 6 scopes to `children` and to `ReactNode` props a consumer fills.
- **A self-closing part.** `DropdownMenu.Item` renders no sibling and needs no wrapper.

## Before you add a wrapper

1. **Read the part's own CSS.** `:nth-child`, `:first-child`, `:last-child`, `has-[… :first-child]`, and every
   `[&>…]` child combinator shift under a new child. Widen each in the same edit, scoped to the new slot
   (`[&>[data-slot=tabs-trigger-label]>svg]:size-5`).
2. **Never widen with `:where()`.** It drops specificity to `(0,0,0)` and hands the cascade to a consumer's own
   class, which silently resizes a shipped icon.
3. **Remember `cx` is tailwind-merge.** Changing a variant prefix moves the class into a different conflict
   group, so a consumer's override stops merging and both classes survive.
4. **Give the wrapper `className="contents"` inside a flex container.** A wrapper that lays out a box takes
   every child out of the parent's `gap`.
5. **Check the wrapper is legal.** A `<li>` inside a `<li>` is not, and neither is a span that breaks a
   `line-clamp` the parent applies through `[&>span]`. When no wrapper is legal, state the contract in the
   JSDoc instead and say so.
6. **Name and document the slot** in the JSDoc and the docs-page API reference, and pin it with a
   `translateTextNodes` test that drives the update which used to throw. A `data-slot` assertion alone stays
   green when the wrapper moves after the sibling.

## What no lint rule can see

Hand-check these. Each was measured, not assumed.

1. **Every `.mdx` file.** oxlint lints none of the 104 in this repo, and docs demos crash like any other code.
2. **Anything inside a JSDoc `@example` fence.** A fence that teaches the crash shape copies into call sites.
3. **A portal a dependency makes.** `SelectPrimitive.ItemText` portals children from inside Radix.
4. **A bare re-export with no JSX.**
5. **A component whose rendered element type changes cross-file.** `<AutoThemeIcon />` before bare text is
   byte-identical to a safe sibling five lines up. There is no type-aware linting here.
6. **A swap that lives in the data, not the JSX.**
7. **Whether a lone opaque child resolves to one string or a whole tree.**
8. **The whole `translate="no"` sweep.** That is content classification, not structure.
9. **`translate="no"` stamped after a props spread.** It is invisible from a call site, so a rule over-reports
   there. Take an inline disable with a reason rather than a code change.

## Reproducing it

`translateTextNodes` from `packages/mantle/src/test-utils/translate-text-nodes.ts` wraps each non-blank text
node in a `<font>` and reparents it, the way Google Translate does. Render, translate, then drive the real
update with `user.click` or `user.keyboard`. happy-dom raises the same `NotFoundError` as Chromium, so these
tests never belong in browser mode.

Two limits to state rather than paper over. The helper wraps each text node on its own, and a real engine
coalesces an inline run into one unit. The crash conclusions hold under either model; the per-token likelihood
does not. A placement error also arrives as an `AggregateError` of `DOMException`s while a deletion error
arrives bare, so catch both shapes.
`packages/mantle/src/test-utils/translate-text-nodes.test.tsx` is the worked reference.
