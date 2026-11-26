---
"@ngrok/mantle": minor
---

Add **`Steps`**, a read-only setup guide.

`Steps` renders an ordered list of steps down a page. A numbered circle in a left gutter marks each step, and one continuous vertical rail joins them. Each step stays visible and nothing is interactive: this is a guide, not a wizard. To show one panel at a time when a reader clicks a step, use `Tabs`. For a step that collapses, use `Accordion`.

- Compound parts: `Steps.Root` (the `<ol role="list">`), `Steps.Item` (one `<li>`), and `Steps.Title` (an `h3` by default). Each part takes `asChild` and merges your `className` last.
- **Composition order is the numbering.** The number is a CSS counter, and the marker's shape comes from the item's position among the visible items. Only a visible `Steps.Item` takes a number and a position, so a `hidden` item, a script, or a server placeholder in the list changes nothing. To hide a step, unmount it or set `hidden`: CSS cannot see a step that a style hides, such as React's `<Activity>` does. A step that you add, remove, or render conditionally renumbers the rest. There is no `index` or `count` prop, and the first server-rendered paint is correct. The counter always counts up from 1, so `Steps.Root` takes no `start` or `reversed` and `Steps.Item` takes no `value`. Under `asChild`, the parts clear these attributes on the child element too: the list that a screen reader announces always matches the numbers on the page.
- The rail is the `border-inline-start` of each item, so it spans the item at each content height and runs through the gap to the next step. The last item keeps the width and drops the color, so removing a step moves nothing sideways. Each offset is a logical property, so the layout flips for right-to-left text.
- Accessible by default: a real `<ol>` of `<li>` elements that restates `role="list"`, because the design removes `list-style` and WebKit drops list semantics from a list that has none. Step position comes from the list. Each marker is one `aria-hidden` unit with no text of its own.
- `Steps.Item` takes no `dangerouslySetInnerHTML` and clears it on an `asChild` child, because the item always renders its marker as a child.
- In forced colors mode, the rail and the marker take the text color, the number takes the page color, and the last item draws no rail below its marker.
- Safe on a translated page: the children of each step render into a `display: contents` label slot, so the marker never sits beside a bare text node.
- Data attributes: `data-slot` on each part (`steps`, `steps-item`, `steps-title`), plus `steps-marker` on the marker and `steps-item-label` on the label slot. Target `steps-marker` to hide the marker column on a narrow surface. Each part joins an incoming `data-slot` chain before its own name.
- Design tokens: `--color-steps-rail` and `--color-steps-number`, set in the light and dark themes. Override them together on an ancestor to re-theme the rail. The number must stay readable on the fill, and the fill must stay opaque.

Import it: `import { Steps } from "@ngrok/mantle/steps"`.

Docs: https://mantle.ngrok.com/components/structure/steps
