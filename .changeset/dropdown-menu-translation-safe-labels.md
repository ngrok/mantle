---
"@ngrok/mantle": patch
---

`DropdownMenu.SubTrigger`, `DropdownMenu.CheckboxItem`, and `DropdownMenu.RadioItem` now render `children` inside a label span: `dropdown-menu-sub-trigger-label`, `dropdown-menu-checkbox-item-label`, and `dropdown-menu-radio-item-label`. Each part renders a caret or a check indicator that never unmounts, so a bare text label was never a lone child. On a page a browser translation engine had translated, the removal React runs when the label changes shape or goes away raised `NotFoundError` and blanked the page. React removes the span instead. Each span is `display: contents`, so an icon and its label stay flex items of the item and keep its `gap`.

**Migration.** An icon you pass as a child of one of these three parts is now a grandchild, so a `[&>svg]` class on the item no longer reaches it. Each part's own default moved with it, to `[&>[data-slot=<part>-label]>svg]:size-5`. Change a `[&>svg]:…` override of your own to `[&_svg]:…`, or put the class on the icon itself. `DropdownMenu.Item` renders no sibling and no wrapper, so its `[&>svg]` default is unchanged.

The three slots are public API, and the docs page lists each beside its part.
