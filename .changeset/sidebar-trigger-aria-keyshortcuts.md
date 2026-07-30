---
"@ngrok/mantle": patch
---

**`Sidebar.Trigger` gets a tooltip and announces the shortcut it binds.**

`Sidebar.Root` has bound `⌘B` / `Ctrl+B` since the sidebar shipped, but the trigger told nobody: assistive technology got no `aria-keyshortcuts`, and pointer users got no label at all — the button is icon-only at every breakpoint, and its name was `sr-only`.

Both are fixed. The trigger now stamps `aria-keyshortcuts` (`"Meta+B"` on Apple platforms, `"Control+B"` elsewhere), resolved after hydration like every platform-modifier read: the server renders the non-Apple answer because it cannot know the host, and an effect corrects it. And it renders a tooltip showing `label` — plus the new `shortcut` prop, for the visible `⌘B` chips (`shortcut={<><MetaKey /><Kbd>B</Kbd></>}`). Unlike `Sidebar.Tooltip`, that tooltip is not gated on the rail state, because the trigger has nothing else to read at any width.

Both the attribute and the chips are omitted under `Sidebar.Root keyboardShortcut={false}`, so the trigger can never advertise a binding that is not bound. `useSidebar()` exposes the same `keyboardShortcut` flag so a custom trigger can be equally honest.

**`Sidebar.Trigger` now requires a `TooltipProvider` ancestor**, like any `Tooltip.Root` — and like `Sidebar.Tooltip` already did. Rendering one without a provider throws. Mount a single provider at your app root, decoupled from the sidebar and the app layout, so the app-wide tooltip delay stays app-wide:

```tsx
import { TooltipProvider } from "@ngrok/mantle/tooltip";

<TooltipProvider>
	<App />
</TooltipProvider>;
```
