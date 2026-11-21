# Typography is a namespace of independent parts over type-role tokens

**Date:** 2026-11-21
**Status:** Proposed
**Builds on:** [2026-11-15-tree-shakeable-compound-components.md](./2026-11-15-tree-shakeable-compound-components.md)

## Context

Mantle serves two kinds of app. A product app, such as the dashboard, has a large budget for JavaScript. A marketing site, such as ngrok.com or gpu.compare, must ship as little JavaScript and CSS as it can. The two kinds use different type scales, and each marketing site has its own. Mantle had no heading or paragraph component, so each app set the sizes by hand.

## Decision

1. **The scale is CSS, not a prop or a context.** `mantle.css` declares type-role tokens in the plain `@theme` block: `--text-heading-1` to `--text-heading-6`, `--text-paragraph`, `--text-lead`, and `--font-heading`. Tailwind makes a class for each one, such as `text-heading-1`, which sets the size, the line height, and the weight. The utilities read the variables, so a site replaces the values with its own `@theme` block, and an element can set them for one section.
2. **Mantle ships the default scale only.** Its values match the scale on the Typography base page. Mantle ships no marketing scale, because each site owns its values.
3. **The parts are a namespace: `Typography.H1` to `Typography.H6`, and `Typography.P`.** Each part name matches the element it renders, so the parts need no `level` prop, and an MDX `components` map assigns one part to each element. MDX content owned by each site (the docs, the blog) is the content path; mantle does not style raw CMS HTML.
4. **The namespace has no `Root`.** [COMPONENT_SPEC.md §1.3](../COMPONENT_SPEC.md#13-name-parts-for-the-dom-and-aria-they-emit) names the outermost part `Root`. These parts are siblings and never nest, so no part is outermost and the rule names nothing. A `Root` would be a wrapper with no job. `Field` is a namespace with no `Root` too.
5. **The parts are server components.** They share no state and use no context. `typography.tsx` opts out of the React Compiler with `"use no memo"`: compiled output imports a cache hook, and the build then marks the chunk `"use client"`. A render with `react-server-dom-webpack` 19.3.1 under the `react-server` condition requests no client reference for the parts. `asChild` renders `Slot`, which is a client component.
6. **`cx` lists the type-role classes in its font-size group.** Without the entry, the vendored merge engine reads an unknown `text-*` class as a color, so `cx("text-heading-2 text-strong")` dropped the size.

## Alternatives considered

- **A context or a provider that selects the scale.** Rejected: the scale is invisible at the call site, it needs a provider in every tree, and HTML with no React cannot read it.
- **A `scale` prop on each part.** Rejected: the Tailwind source scan finds both scales' classes in the component's JavaScript, so every app ships both. [COMPONENT_SPEC.md §1.9](../COMPONENT_SPEC.md#19-build-the-behavior-in-before-you-add-a-prop) makes a size a token, not a prop.
- **A separate entry point for each scale.** Rejected: two components for one intent, and shared content must choose a scale when it imports.
- **A `Typography.Root` container with a `type-prose` utility that styles raw HTML.** Rejected: no site renders CMS HTML. Each site owns its content as MDX, and MDX maps each element to a part.
- **`Typography.Heading` with a `level` prop, and `Typography.Paragraph`.** Rejected by Cody Price on 2026-11-21. The author picks a heading level on purpose, because the level carries meaning in the outline of the page. A `level` prop adds only developer convenience, which does not justify it. The part names also match the elements, and an MDX `components` map assigns one part to each element.

## Consequences

- [COMPONENT_SPEC.md §3.4](../COMPONENT_SPEC.md#34-compound-namespace) says a leaf component stays a standalone export. These parts are leaves that share no state. The namespace keeps them together, and the `export * as` shape lets a bundler drop the parts that an app does not read.
- A site that changes a role must set each of its sub-keys. A sub-key it leaves out keeps mantle's value, and mantle cannot test a site's stylesheet. The Typography base page documents the contract.
- The default scale grows with the viewport, because it copies the existing `--text-*` sizes. A fixed product scale is a later change to the token values only.
- No build check keeps the parts server-safe. A hook added to `typography.tsx` gets no `"use client"`, so a server render then fails. Review catches it, and the `"use no memo"` comment names the constraint.
