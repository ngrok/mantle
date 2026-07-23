---
"@ngrok/mantle": patch
---

Charts no longer render fractional axis ticks for integer-valued data (MNTL-56).

When every value backing an axis is an integer — request counts, error totals — the tick step is clamped to whole numbers, so a small domain like `[0, 3]` ticks at `0, 1, 2, 3` instead of `0, 0.5, 1, …`. The clamp follows the data, not the axis part: it covers the value axis in both bar orientations (including the value ticks painted along the bottom of horizontal bars) and linear x axes on line, area, and scatter charts. Any fractional value in the data restores sub-integer stepping, and `tickCount` remains an approximate hint.
