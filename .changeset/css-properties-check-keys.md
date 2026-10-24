---
"@ngrok/mantle": patch
---

`$cssProperties` from `@ngrok/mantle/types` now checks each key of an object literal. A key that starts with `--` is still a valid CSS variable, and the return type is still React's `CSSProperties`, so `style={$cssProperties({ "--gap": 8, ...style })}` compiles as before. A misspelled key that does not start with `--`, such as `displya`, now fails to compile. Before, it compiled and had no effect. Fix the spelling at that call site.
