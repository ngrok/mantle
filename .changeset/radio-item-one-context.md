---
"@ngrok/mantle": patch
---

`RadioGroup`, `SegmentedControl`, and radio `Choice` items hydrate about 10% faster: 246 ms in place of 276 ms for 1,200 items in Chromium with a 4× CPU throttle (median of 15 paired runs). Each item finds a title `<label>` without a selector query, and gives its parts one context in place of two. Every `RadioGroup.Indicator` with no children shares one default circle element.
