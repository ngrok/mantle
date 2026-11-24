---
"@ngrok/mantle": minor
---

Mantle's `data-*` attributes follow one mantle-owned contract. The names from Radix, Ariakit, and Headless UI are gone, and each part emits fewer attributes.

Breaking changes:

- `mantle.css` registers no `data-*` custom variants. `data-state-open:`, `data-state-closed:`, `data-state-checked:`, `data-state-active:`, `data-side-*:`, `data-orientation-*:`, `data-validation-*:`, `data-active-item:`, and the others no longer exist. Use Tailwind's built-in forms: `data-open:`, `not-data-open:`, `data-[side=top]:`, `data-[validation=error]:`, `aria-expanded:`, `aria-selected:`.
- Triggers carry `aria-expanded` and no `data-state`. Tooltip and HoverCard triggers carry no state attribute.
- Open content, panels, and items carry presence-only `data-open` in place of `data-state="open|closed"`. `Sidebar.Nav` carries `data-expanded` in place of `data-state="expanded|collapsed"`. A native `<dialog>` part (Dialog, AlertDialog, Sheet, and the Sidebar mobile sheet) also carries `data-closing` while its exit plays.
- Tabs triggers and Select items use `aria-selected`, Switch and menu checkbox items use `aria-checked`, and an inactive `Tabs.Content` has the `hidden` attribute. None of them carries `data-state`.
- Buttons, tabs, menu items, Select items, and Command items carry no `data-disabled`. Use `disabled:` or `aria-disabled:`. Label and the Input chrome keep presence-only `data-disabled`.
- `data-align` is gone from every floating part. `data-current` is gone from Sidebar rows: style them with `aria-[current=page]:`. List rows and OTP slots carry `data-highlighted` in place of `data-active`, and a MultiSelect tag uses DOM focus.
- Progress parts carry `data-indeterminate` in place of `data-state`, `data-value`, `data-min`, and `data-max`. Charts carry `data-engaged` in place of `data-state="dormant|engaged"`. `CodeBlock.Code` carries `data-syntax-highlighted` in place of `data-highlighted="true|false"`.
- `data-drag-over`, `data-x-overflow`, `data-x-scroll-end`, and `data-sticky-active` are `""` when true and absent when false, never `"true"` or `"false"`.

The codemod rewrites the old class variants and the `data-state` test assertions.

Migration guide: https://mantle.ngrok.com/migrations/0029-data-attribute-contract-migration
