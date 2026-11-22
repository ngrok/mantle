---
"@ngrok/mantle": patch
---

`RadioGroup`, `SegmentedControl`, and radio `Choice` items hydrate about 10% faster. Each item finds a title `<label>` without a selector query, and gives its parts one context in place of two. Every `RadioGroup.Indicator` with no children shares one default circle element.
