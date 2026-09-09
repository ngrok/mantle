---
"@ngrok/mantle": patch
---

When `MultiSelect.TagValues` unmounts, it now drops its keyboard handler and its locks. Before, `MultiSelect.Input` kept calling the handler from the last render of `TagValues`, so Backspace on an empty input removed the value that was last at that time. `MultiSelect.Item` also kept honoring locks for a tag list that no longer existed.
