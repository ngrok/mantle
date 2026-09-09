---
"@ngrok/mantle": patch
---

`Calendar` now passes `DayPicker` one stable `components` object, and a `classNames` object that changes only when your `className`, `classNames`, or `mode` changes. Before this change, every `Calendar` render handed `DayPicker` two new objects, so `DayPicker` rebuilt its date model and month grid on each render and remounted both navigation carets. A controlled picker re-renders on every day click, so that rebuild ran on each click. Selection, navigation, and your `classNames` and `components` overrides behave as before.
