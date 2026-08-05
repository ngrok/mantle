---
"@ngrok/mantle": patch
---

`TextArea` now renders its default appearance at the same font size as `Input` and `Select`, and its
`monospaced` appearance a step smaller.

The default (non-monospaced) `TextArea` only set `pointer-coarse:text-base`, so on a fine pointer (desktop) it
had no font-size class and fell back to the 16px UA/root default — 2px larger than the `text-sm` (14px) that
`Input` and `Select` use. Adding the missing `text-sm` base brings it in line: 14px on desktop, 16px on touch,
matching the other form controls.

The `monospaced` appearance drops from the arbitrary `0.8125rem`/`0.9375rem` sizes to `text-xs/5` on desktop
(12px font with the `text-sm` `1.25rem` line-height, so its rows and baseline stay aligned with the default
appearance) and `pointer-coarse:text-base` (16px) on touch. The 16px touch size matches the other form
controls and, crucially, stays at or above the 16px threshold that iOS Safari uses to decide whether to
auto-zoom into a focused field — so tapping the monospaced textarea on iOS no longer triggers a zoom.
