# A core primitive ships unstyled parts beside its styled parts

**Date:** 2026-11-23
**Status:** Accepted
**Builds on:** [2026-11-21-mantle-owned-behavior-hooks.md](./2026-11-21-mantle-owned-behavior-hooks.md), [2026-11-15-tree-shakeable-compound-components.md](./2026-11-15-tree-shakeable-compound-components.md)

## Context

The ngrok marketing site (`ngrok-private/frontend`, `apps/www`) draws tabs that look nothing like the product tabs: large use-case cards on the homepage and on each use-case page. `Tabs` draws the product look, so the site imported `@radix-ui/react-tabs` directly and wrapped its trigger to copy the mantle focus ring. The site then lost each fix that mantle made to tabs after it moved off Radix (#1777): the press that focuses without the focus ring, the scroll of a keyboard-focused tab into view, the Tab-order entry, `hiddenUntilFound`, and the link-tab rules. The same gap applies to other core primitives, such as an accordion or a dialog in a marketing layout. Cody Price asked for one answer that keeps the behavior and leaves the look to the site.

## Decision

1. **A core primitive ships an unstyled namespace from its own entry, named `Headless<Name>`.** `@ngrok/mantle/tabs` exports `Tabs` and `HeadlessTabs`. The headless namespace has the parts that carry behavior (`Root`, `List`, `Trigger`, `Content` for tabs) with the same names and props as the styled parts, minus the props that only choose a look (`appearance`). It has no part that is only decoration (`Separator`, `Badge`).
2. **The styled parts compose the headless parts.** `Tabs.Trigger` renders `HeadlessTabs.Trigger` with its variant classes. A part with no look of its own is the headless part under its styled name (`const Content = HeadlessTabs.Content`). So the library has one behavior path, and a fix reaches both namespaces. The two namespaces share one context, so a page can mix them, such as a `HeadlessTabs.Trigger` inside a `Tabs.List`.
3. **A headless part keeps the accessibility floor and nothing else.** It keeps:
   - roles, ARIA, the keyboard contract, and focus management
   - the mantle focus ring for keyboard focus (`focus-visible:focus-ring`), so a site does no work to get a visible, consistent ring
   - a class that a behavior needs to be correct, such as `[[hidden=until-found]]:sr-only`
   - `data-slot`, `data-state`, `data-orientation`, and `asChild`

   It has no layout, color, spacing, or type class.

4. **The hooks stay internal.** Parts are the public layer. A site that migrates from Radix changes an import and keeps its JSX. The hooks (`useTabs`, `getTabProps`) keep the freedom to change.

To add the pattern to another primitive: move the behavior of each styled part into `headless-<name>.tsx`, export the parts from `headless-<name>-parts.ts`, alias the namespace in `index.ts`, and make each styled part render its headless part. The existing tests of the styled parts must pass unchanged.

## How we measured

A Vite 8 production build of each entry, React external, minified, gzip `-9`. Each entry reads `Root`, `List`, `Trigger`, and `Content`. The hand-written baseline is an 80-line WAI-ARIA tabs with a roving `tabIndex`, the arrow keys with wrap, Home and End, automatic activation, and ids. It has no find-in-page, no overflow scroll, no link tabs, and no press without the focus ring. The page base is `cx` and `Slot`, which every marketing page loads already, because `Slot` merges classes with `cx`.

| Entry                        | Gzip alone | Gzip on top of the page base |
| ---------------------------- | ---------: | ---------------------------: |
| Hand-written baseline        |     0.7 KB |                      +0.6 KB |
| `@radix-ui/react-tabs` 1.2.1 |     8.8 KB |                      +8.6 KB |
| `HeadlessTabs`               |    10.2 KB |                      +2.8 KB |
| `Tabs` before this change    |    11.2 KB |                            – |
| `Tabs`                       |    11.3 KB |                      +3.9 KB |
| `Tabs` and `HeadlessTabs`    |    11.3 KB |                      +3.9 KB |

- On a page that has `cx` and `Slot`, `HeadlessTabs` costs 5.8 KB less than Radix. Alone, it costs more than Radix, because `Slot` brings `cx` (6.7 KB). A page with no other mantle part is not a case that ngrok has today.
- The 2.2 KB over the hand-written baseline buys the fixes listed in Context, manual activation, disabled tabs, right-to-left keys, and `asChild`.
- `Tabs` grows 86 bytes, the cost of one behavior path for both namespaces. A page that uses both namespaces pays 9 bytes more than a page with `Tabs` only.

## Alternatives considered

- **Export the hooks only.** Rejected: each of the 16 marketing files would rewire its own context and props. The parts do the same job with an import change.
- **An `unstyled` prop on each styled part.** Rejected: a prop bag that every styled part must check, and the variant classes still ship.
- **A second subpath, such as `@ngrok/mantle/tabs/headless`.** Rejected: the namespace entry already tree-shakes, and a new subpath changes the export map, the Tailwind source globs, and the agent manifest for no byte gain.
- **Keep Radix on the marketing site.** Rejected: the site keeps a second tabs library and loses each mantle fix.

## Consequences

- A site gets mantle's tabs behavior in any look, and a fix in mantle reaches it with the next release.
- Each styled part is one component layer deeper. The test suite of `Tabs` passes unchanged, so the behavior and the look did not change. The class string of `Tabs.Trigger` starts with the focus-ring classes, and the root writes `data-orientation` before `data-appearance`. A DOM snapshot test of a consumer can see that order.
- `Tabs.Content` outside a root throws the `HeadlessTabs.Content` message, which names both roots.
- The focus ring is not optional in the headless parts. A site that wants a different ring changes its tone or width with a `ring-focus-*` or `ring-*` class.
