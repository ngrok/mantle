---
"@ngrok/mantle": patch
---

Charts ship no d3 code. Mantle computes time-axis ticks, tick labels, and line and area paths with its own code, and `@ngrok/mantle` no longer depends on `d3-scale`, `d3-shape`, `d3-time`, or `d3-time-format`. The package ships the d3 license for the code that mantle ported, in `src/components/chart/d3-license.md`.

The ticks, the labels, and the paths are the same as before. Tests compare the ticks and labels with `d3-scale`'s `scaleTime` across 4,000 time domains, and again in six time zones that change their offset, and compare each line and area path with `d3-shape` call for call.

The removal takes about 13 KB of JavaScript (minified and gzipped) out of each chart family: about 6 KB with `d3-scale`, which also pulled in `d3-interpolate` and `d3-color`, and about 7 KB with the other three packages.
