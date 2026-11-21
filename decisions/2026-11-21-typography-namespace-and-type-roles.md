# Typography is a namespace of independent parts over type-role tokens

**Date:** 2026-11-21
**Status:** Proposed
**Builds on:** [2026-11-15-tree-shakeable-compound-components.md](./2026-11-15-tree-shakeable-compound-components.md)

## Context

Mantle serves two kinds of app. A product app, such as the dashboard, has a large budget for JavaScript. A marketing site, such as ngrok.com or gpu.compare, must ship as little JavaScript and CSS as it can. The two kinds use different type scales, and each marketing site has its own. Mantle had no heading or paragraph component, so each app set the sizes by hand.

## Decision

1. **The scale is CSS, not a prop or a context.** `mantle.css` declares type-role tokens in the plain `@theme` block: `--text-heading-1` to `--text-heading-6`, `--text-paragraph`, `--text-lead`, and `--font-heading`. Tailwind makes a class for each one, such as `text-heading-1`, which sets the size, the line height, and the weight. The utilities read the variables, so a site replaces the values with its own `@theme` block, and an element can set them for one section.
2. **Mantle ships the default scale only.** Its values match the scale on the Typography base page. Mantle ships no marketing scale, because each site owns its values.
3. **The parts are a namespace: `Typography.Root`, `Typography.H1` to `Typography.H6`, and `Typography.P`.** Each part name matches the element it renders, so the parts need no `level` prop, and an MDX `components` map assigns one part to each element.
4. **`Typography.Root` is the prose container.** [COMPONENT_SPEC.md §1.3](../COMPONENT_SPEC.md#13-name-parts-for-the-dom-and-aria-they-emit) requires an outermost `Root`. Here it renders the `type-prose` utility, which styles the direct-child headings, paragraphs, and lists of HTML that no one maps to components. The other parts work without it.
5. **The parts share no state.** They use no context, so they need no provider. Like every compiled mantle component, they ship as client components, because the React Compiler adds a memo-cache hook. A page that must ship no JavaScript uses the classes (`text-heading-1`, `type-prose`) on plain HTML and gets the same styles.
6. **`cx` lists the type-role classes in its font-size group.** Without the entry, the vendored merge engine reads an unknown `text-*` class as a color, so `cx("text-heading-2 text-strong")` dropped the size.

## Alternatives considered

- **A context or a provider that selects the scale.** Rejected: the scale is invisible at the call site, it needs a provider in every tree, and HTML with no React cannot read it.
- **A `scale` prop on each part.** Rejected: the Tailwind source scan finds both scales' classes in the component's JavaScript, so every app ships both. [COMPONENT_SPEC.md §1.9](../COMPONENT_SPEC.md#19-build-the-behavior-in-before-you-add-a-prop) makes a size a token, not a prop.
- **A separate entry point for each scale.** Rejected: two components for one intent, and shared content must choose a scale when it imports.
- **`Heading` with a `level` prop and a separate `Paragraph`.** Rejected for the namespace: the parts read as the elements they render, and MDX maps one to one.

## Consequences

- [COMPONENT_SPEC.md §3.4](../COMPONENT_SPEC.md#34-compound-namespace) says a leaf component stays a standalone export. These parts are leaves that share no state. The namespace keeps them together, and the `export * as` shape lets a bundler drop the parts that an app does not read.
- A site that changes a role must set each of its sub-keys. A sub-key it leaves out keeps mantle's value, and mantle cannot test a site's stylesheet. The Typography base page documents the contract.
- The default scale grows with the viewport, because it copies the existing `--text-*` sizes. A fixed product scale is a later change to the token values only.
