---
"@ngrok/mantle": patch
---

Add `yieldToSidePanel` and `yieldToSidePanelBelow` to `Sidebar.Root`. In a shell with an `AppLayout.SidePanel`, set `yieldToSidePanel` on a `Sidebar.Root` inside `AppLayout.SidePanelRoot`. While the panel is open in a window narrower than `yieldToSidePanelBelow` (default `"56.5rem"`, the `--container-side-panel-lane` theme token), an expanded rail collapses to its icons, so the panel sits beside the page. When the panel closes or the window widens, a rail that the panel collapsed expands again. A rail that the reader toggled in between keeps their choice.

`onOpenChange` reports only the reader's toggles, so a sidebar cookie keeps their preference. The collapse lands in the same frame as the panel, so your app needs no `useEffect` for it.

If you copied `AssistantSidebarRoot` from the Assistant Across Routes recipe, replace it with `<Sidebar.Root yieldToSidePanel={panelMounted}>` and delete your copy. If your copy used a width other than `56.5rem`, pass it to `yieldToSidePanelBelow`.

Docs: https://mantle.ngrok.com/components/navigation/sidebar#yielding-to-a-side-panel
