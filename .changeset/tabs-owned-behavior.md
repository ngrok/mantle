---
"@ngrok/mantle": minor
---

`Tabs` and the `CodeBlock` tab parts no longer use `@radix-ui/react-tabs`. Mantle owns the WAI-ARIA tabs behavior in one small hook. The parts, their props, and their `data-*` attributes do not change. The `tabs` entry ships 6 KB (gzip) less on its own.

- **Breaking:** a Radix Tabs part inside a mantle `Tabs.Root` has no context and throws. Replace a Radix `Trigger` (or your own wrapper around one, such as a `TabsTrigger` in `~/components/tabs-trigger`) with `Tabs.Trigger`, and keep its classes. Guide: https://mantle.ngrok.com/migrations/0023-tabs-owned-behavior-migration
- **New:** `<Tabs.Content hiddenUntilFound>` keeps an inactive panel's text in the HTML as `hidden="until-found"`. Find-in-page and a fragment link reveal it and activate its tab. React warns once in development about the `HIDDEN` attribute that sets it.
- The active tab is a Tab stop in the server HTML, so the keyboard reaches it before hydration. The tab list is no longer a Tab stop.
- The root sets `dir` only when you pass it. In a right-to-left page, **ArrowLeft** now moves to the next tab.
