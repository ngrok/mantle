---
"@ngrok/mantle": patch
---

Fix three defects found by an adversarial audit of the test suite, and stabilize default fallback elements.

**`Toast.Icon` silently discarded a custom `svg` for `intent="info"`.** The `info` branch rendered its
built-in `InfoIcon` unconditionally while every sibling intent honored `svg ?? …`, so
`<Toast.Root intent="info"><Toast.Icon svg={<MyIcon />} /></Toast.Root>` painted the default icon. The
per-intent branches are now two module-scope maps keyed by `ToastIntent`, which resolves the bug and makes
a future missing intent a type error rather than a branch that can forget the fallback.

**`MediaObject.Root`, `MediaObject.Media`, and `MediaObject.Content` dropped almost every prop.** All three
parts destructured `asChild`/`className`/`children`/`style`/`ref` with no rest spread, so `id`, `onClick`,
`aria-*`, and `data-*` were accepted by the types (`ComponentProps<"div">`) and then thrown away. They now
spread the remaining props onto the rendered element like every other mantle part.

**`countryCodes` listed `"016"` twice**, so the exported list had 739 entries for 738 distinct codes.

Default fallback elements in `Toast.Icon`, `OtpInput.Separator`, `Breadcrumb.Separator`,
`SplitButton.MenuTrigger`, `DataTable.ExpandHeader`, and `ThemeSwitcher.Content` are now hoisted to module
scope, so each is one stable element reference shared across renders instead of a fresh allocation on every
render. No public API changes.
