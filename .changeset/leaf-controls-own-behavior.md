---
"@ngrok/mantle": patch
---

`Switch`, `ProgressBar`, `RadioGroup`, and `SegmentedControl` no longer use a third-party primitive. Mantle drops `@headlessui/react` (and the React Aria and Floating UI packages it pulled in), `@radix-ui/react-switch`, and `@radix-ui/react-progress`.

Bundle sizes (gzip, React external): `RadioGroup` 21.3 KB → 13.6 KB, `Switch` 14.5 KB → 11.2 KB, `ProgressBar` 12.7 KB → 10.9 KB.

- `RadioGroup` and `SegmentedControl` keep the WAI-ARIA radio group contract: one Tab stop, arrow keys that move and check with wrap, and Space that checks. Props, data attributes, and the `Indicator` state stay the same. A check now commits at once, so code that reads `aria-checked` right after a click sees the new state. A form reset returns an uncontrolled group to `defaultValue`.
- `Switch` renders its hidden checkbox only when it has a `name`. A form reset returns an uncontrolled switch to `defaultChecked`. Its type no longer offers `asChild`, which never worked: the switch slotted its props onto its own thumb.
- `ProgressBar.Root` sets `aria-valuetext` to the percent, as before.
