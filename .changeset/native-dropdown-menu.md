---
"@ngrok/mantle": minor
---

Build `DropdownMenu` on native popovers and CSS anchor positioning, and remove Radix from it. The parts and their nesting do not change.

- `DropdownMenu.Content` and `DropdownMenu.SubContent` do not take the Radix positioning props: `alignOffset`, `avoidCollisions`, `collisionBoundary`, `collisionPadding`, `arrowPadding`, `sticky`, `hideWhenDetached`, `updatePositionStrategy`, and `forceMount`.
- The content hides its scrollbar and stops overscroll bounce and scroll chaining. It still scrolls by wheel, touch, and keyboard. A new `scrollbar-none` utility in `mantle.css` hides a scrollbar.
- The content sets `--anchor-width` and `--available-height`. They replace `--radix-dropdown-menu-trigger-width` and `--radix-dropdown-menu-content-available-height`.
- A modal menu sets `inert` on the rest of the page. A `Popover` or other float that an item opens portals into the menu, so it takes keyboard focus and input.
- `DropdownMenu.RadioGroup` takes `defaultValue`, and `DropdownMenu.CheckboxItem` takes `defaultChecked`. `ArrowUp` on the trigger opens the menu on its last item. `onValueChange` does not run when the user selects the checked radio item.

Run migration 0023 to remove the props and rename the variables: `pnpm -w run migrate 0023 <path>`. See https://mantle.ngrok.com/migrations/0023-native-dropdown-menu-migration.
