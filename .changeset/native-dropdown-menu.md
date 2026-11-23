---
"@ngrok/mantle": minor
---

Build `DropdownMenu` on native popovers and CSS anchor positioning, and remove Radix from it. The parts and their nesting do not change.

- `DropdownMenu.Content` and `DropdownMenu.SubContent` do not take the Radix positioning props: `alignOffset`, `avoidCollisions`, `collisionBoundary`, `collisionPadding`, `arrowPadding`, `sticky`, `hideWhenDetached`, `updatePositionStrategy`, and `forceMount`.
- The content hides its scrollbar and stops overscroll bounce and scroll chaining. It still scrolls by wheel, touch, and keyboard. Its items scroll in an inner `dropdown-menu-viewport` element with the `scroll-fade-y` edge fade. Under `asChild`, your element scrolls the items itself, with no fade.
- The content sets `--anchor-width` and `--available-height`. They replace `--radix-dropdown-menu-trigger-width` and `--radix-dropdown-menu-content-available-height`.
- A menu is not modal by default, as with a native popover and the WAI-ARIA menu button pattern. The page behind it stays live. A press outside closes the menu, and its primary click (left button, no Ctrl) does not activate what is under it. Pass `modal` to make the rest of the page inert. A `Popover` or other float that an item opens portals into the menu, so it takes keyboard focus and input.
- `DropdownMenu.RadioGroup` takes `defaultValue`, and `DropdownMenu.CheckboxItem` takes `defaultChecked`. `ArrowUp` on the trigger opens the menu on its last item. `onValueChange` does not run when the user selects the checked radio item.

Run migration 0026 to remove the props and rename the variables: `pnpm -w run migrate 0026 <path>`. See https://mantle.ngrok.com/migrations/0026-native-dropdown-menu-migration.
