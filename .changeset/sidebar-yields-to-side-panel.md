---
"@ngrok/mantle": patch
---

`Sidebar` now yields its width to an open `AppLayout.SidePanel`. While the panel is open in a window narrower than the `--container-side-panel-lane` theme token (`56.5rem`), an expanded sidebar collapses, so the panel sits beside the page and does not float over it. When the panel closes, unmounts, or the window widens, a sidebar that the panel collapsed expands again. If the reader toggles the sidebar in between, their choice stands.

The behavior is built in. No prop turns it on, and `Sidebar.Root` and `AppLayout.SidePanelRoot` can nest in either order. `onOpenChange` reports only the reader's toggles, so a sidebar cookie keeps their preference. `useSidebar().open` reports the state on screen.

If you copied `AssistantSidebarRoot` from the Assistant Across Routes recipe, replace it with `Sidebar.Root` and delete your copy. The recipe no longer has that part.

Docs: https://mantle.ngrok.com/components/navigation/sidebar#yielding-to-a-side-panel
