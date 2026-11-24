---
"@ngrok/mantle": minor
---

Mantle registers a `between:` Tailwind variant, and its parts use it in place of `space-*` and `divide-*`. `between:` applies a class to each child of an element except the last, at zero specificity, as `space-*` and `divide-*` do, so the parts look the same. Tailwind puts the class of `space-*` and `divide-*` inside `:where()`, so Chromium tries those rules on each element of the page on each style pass. Chromium skips a `between:` rule at once outside the element. On a page of 1,200 elements at 4× CPU slowdown, the largest style pass of a `Dialog` open drops from 28 ms to 25 ms in Chromium.

Breaking: a `space-*` or `divide-*` class that you pass to `Accordion.Root`, `Strata.Root`, `AlertDialog.Body`, `AlertDialog.Header`, `AlertDialog.Footer`, `Empty.Description`, `Select.Group`, `Select.Content`, `DropdownMenu.Group`, `DropdownMenu.RadioGroup`, `DropdownMenu.Content`, `DropdownMenu.SubContent`, `MultiSelect.Content`, `Combobox.Content`, `Combobox.Group`, `Sidebar.Body`, `Sidebar.List`, or `SplitButton.MenuContent` no longer replaces the part's own spacing or dividers. Write it with `between:`, such as `between:border-b-0` on `Accordion.Root` in place of `divide-y-0`. Read the [migration guide](https://mantle.ngrok.com/migrations/0030-between-variant-migration); its codemod rewrites those classes.
