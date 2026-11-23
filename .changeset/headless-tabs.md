---
"@ngrok/mantle": patch
---

Add `HeadlessTabs` to `@ngrok/mantle/tabs`: tabs with the behavior of `Tabs` and no look of their own, for pages that draw tabs in their own visual language, such as a marketing page. `HeadlessTabs.Root`, `HeadlessTabs.List`, `HeadlessTabs.Trigger`, and `HeadlessTabs.Content` take the props of the `Tabs` parts, except `appearance`.

The parts keep the keyboard and ARIA contract, `hiddenUntilFound`, the scroll of a keyboard-focused tab into view, link tabs through `asChild`, and the mantle focus ring for keyboard focus. A pointer press focuses a trigger without the ring. They stamp the same `data-slot`, `data-state`, `data-orientation`, and `data-disabled` attributes as `Tabs`, so style the states with `data-state-active:` and `data-state-inactive:`. The two namespaces share one state, so a `HeadlessTabs.Trigger` works inside a `Tabs.List`.

A page that imports `@radix-ui/react-tabs` for its own tab look can change the import to `HeadlessTabs` and keep its JSX. The behavior and look of `Tabs` do not change. Its parts now render the `HeadlessTabs` parts, so the class string of `Tabs.Trigger` starts with the focus-ring classes, and `Tabs.Content` outside a root throws the `HeadlessTabs.Content` message.

See https://mantle.ngrok.com/components/navigation/tabs#headless-tabs.
