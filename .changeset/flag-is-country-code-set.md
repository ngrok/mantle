---
"@ngrok/mantle": patch
---

`isCountryCode` now checks a `Set` built once at module load instead of scanning the 751-entry `countryCodes` array on every call, so narrowing one code per table row no longer costs a linear scan per row. The results are unchanged: a string in `countryCodes` returns `true`; a lowercase code, a number, an array, `null`, or `undefined` returns `false`.
