---
"@ngrok/mantle": patch
---

Remove class names that emit no CSS from `Button`, `Calendar`, `DropdownMenu`, `Popover`, and `TextArea`. Mantle's styles do not change, and the `class` attributes of `Button`, `Calendar`, `DropdownMenu`, and `Popover` are shorter.

- `Button` with `appearance="link"` no longer sets the `group/button-link` group. If a child uses a `group-*/button-link:` variant, add `group/button-link` to the button's `className`.
- `Calendar` no longer sets `day` on each day button, or `day-outside` and `day-range-middle` on day cells. `day-range-start` and `day-range-end` stay. To target outside days, use `[data-outside]`. To add a class to the middle of a range, pass `classNames.range_middle`; it replaces mantle's classes for those cells.
- `DropdownMenu` and `Popover` no longer set `text-popover-foreground`, `focus:bg-accent`, `aria-expanded:bg-accent`, or `focus:text-accent-foreground`. If your theme defines `--color-popover-foreground`, `--color-accent`, or `--color-accent-foreground`, these parts no longer read them. Set the colors through `className`.
- An `asChild` child of `DropdownMenu.Item`, `DropdownMenu.SubTrigger`, or `DropdownMenu.Content` that merges its own `focus:text-*`, `focus:bg-*`, `aria-expanded:bg-*`, or `text-*` default with `cx` now keeps that default. Before, the removed class replaced it.
