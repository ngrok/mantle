---
"@ngrok/mantle": patch
---

`useCallbackRef` from `@ngrok/mantle/hooks` now accepts a callback with typed parameters, such as `(values: string[]) => void`. Before this change, its generic constraint rejected any callback whose parameters were narrower than `unknown`, so only a callback with no parameters, or with parameters typed `unknown`, compiled. The returned function keeps the exact signature of the callback you pass.
