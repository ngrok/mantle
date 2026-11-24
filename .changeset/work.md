---
"@ngrok/mantle": minor
---

Add `Work` at `@ngrok/mantle/work`. It folds the reasoning and the tool calls of one chat answer under one toggle that reads "Show work" or "Hide work". Set `streaming` on `Work.Root`, and the work shows while the answer streams and folds away when it ends. The reader's choice wins: a press on the toggle, or a press or focus on a step while the answer streams, keeps the work the way the reader left it. `Work.Root` stamps `data-streaming` while `streaming` is set.

`ToolCall.Trigger` and `Reasoning.Trigger` now show their caret only on hover, keyboard focus, or while open. On a touch screen the caret always shows, and the row is taller to tap.

Docs: https://mantle.ngrok.com/components/ai/work
