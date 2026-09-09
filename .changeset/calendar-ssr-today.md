---
"@ngrok/mantle": patch
---

The `Calendar` JSDoc and docs page now state the server-rendering contract. If you omit `today`, `DayPicker` reads the clock during render, once on the server and again in the browser. If the two clocks or time zones disagree on the date, the `today` highlight and its `Today, …` label land on different days. React then reports a hydration mismatch. Under SSR, pass `today` and `defaultMonth` (or `month`) from one request-scoped date. Nothing changes at runtime.
