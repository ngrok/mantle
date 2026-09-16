---
"@ngrok/mantle": patch
---

`asChild` now works on `DropdownMenu.SubTrigger`, `DropdownMenu.CheckboxItem`, `DropdownMenu.RadioItem`, `Select.Trigger`, `Select.Item`, and `MultiSelect.Item`.

Each of the six renders a second element beside your children: a submenu caret, or a check indicator. The prop threw at render on every one of them, because the slot received two children and takes exactly one. Each part now clones your single child as its element and moves the label span and that second element inside it. Your child keeps its own props, and the part's class names, data attributes, and `ref` merge onto it.

```tsx
<DropdownMenu.RadioItem value="small" asChild>
  <Link to="?size=small">Small</Link>
</DropdownMenu.RadioItem>
```

The label wrapper each part carries for translated pages rides along, so a bare string inside your child stays safe on both paths.
