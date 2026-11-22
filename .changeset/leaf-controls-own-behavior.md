---
"@ngrok/mantle": patch
---

`Switch` and `ProgressBar` no longer use a third-party primitive. Mantle drops `@radix-ui/react-switch` and `@radix-ui/react-progress`.

Bundle sizes (gzip, React external): `Switch` 14.5 KB → 11.2 KB, `ProgressBar` 12.7 KB → 10.9 KB.

- `Switch` renders its hidden checkbox only when it has a `name`. A form reset returns an uncontrolled switch to `defaultChecked`. Its type no longer offers `asChild`, which never worked: the switch slotted its props onto its own thumb.
- `ProgressBar.Root` sets `aria-valuetext` to the percent, as before.
