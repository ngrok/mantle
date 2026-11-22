---
"@ngrok/mantle": minor
---

`Popover`, `Tooltip`, and `HoverCard` are native popovers in the top layer. CSS anchor positioning places each one next to its trigger, and a script places it where the browser has no anchor positioning. Radix is gone from the three components, and `@radix-ui/react-popover`, `@radix-ui/react-tooltip`, and `@radix-ui/react-hover-card` are no longer dependencies.

Breaking changes (migration guide and codemod: https://mantle.ngrok.com/migrations/0020-native-floats-migration):

- `Popover.Content`, `Tooltip.Content`, and `HoverCard.Content` no longer take `collisionPadding`, `collisionBoundary`, `sticky`, `avoidCollisions`, `alignOffset`, `hideWhenDetached`, `forceMount`, `updatePositionStrategy`, or `arrowPadding`. The content flips to the opposite side when only that side fits, and shifts to stay inside the viewport.
- `Popover.Root` no longer takes `modal`. Use `Dialog` for a task that blocks the page.
- `HoverCard.Portal` is gone. `HoverCard.Content` portals by itself.
- `Popover.Content` sets `--anchor-width` and `--available-height` in place of `--radix-popover-trigger-width` and `--radix-popover-content-available-height`.
- A float inside a `Popover` portals into `Popover.Content`.
- A float does not show while an overlay that does not hold it is open. A tooltip or hover card closes, and a popover shows again when the overlay closes.
- `Tooltip.Trigger asChild` and `HoverCard.Trigger asChild` join `tooltip-trigger` or `hover-card-trigger` ahead of the child's `data-slot`, as `Popover.Trigger` does.
- A closed float stays in the DOM for its 150ms exit transition.

`TooltipProvider` is now optional. In a browser with no popover API (Safari before 17, Chrome before 114, Firefox before 125), a float is a fixed box at `z-50`, as before.
