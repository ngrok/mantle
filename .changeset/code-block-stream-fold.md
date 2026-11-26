---
"@ngrok/mantle": patch
---

Streamed code folds once its stream ends, the same as pre-rendered code. `useCodeBlockStream` takes `complete`: while it is `false`, each line of a language that folds makes room for the fold gutter, so the toggles shift no code when they appear; once it is `true`, the worker computes the fold ranges in one pass. `Markdown` passes it, so a fence folds when the answer stops streaming. A caller that leaves `complete` unset sees no change.
