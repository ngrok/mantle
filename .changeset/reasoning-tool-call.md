---
"@ngrok/mantle": minor
---

Add `Reasoning` and `ToolCall`, the steps of a chat answer. Each one folds under a one-line row and starts closed, so the answer stays what the reader sees first.

- `Reasoning` at `@ngrok/mantle/reasoning` holds a model's reasoning. Set `streaming` on `Reasoning.Root`, and `Reasoning.Trigger` reads "Thinking…" and pulses. After that it shows its children, such as "Thought for 4 seconds", or "Reasoning". `Reasoning.Content` holds the text. `Reasoning.Root` stamps `data-streaming` while `streaming` is set.
- `ToolCall` at `@ngrok/mantle/tool-call` holds one tool call. `ToolCall.Root` takes `status`: `"running"`, `"done"`, `"failed"`, or `"interrupted"`, and stamps `data-status`. `ToolCall.Trigger` shows an icon and a word for the state beside its children. `ToolCall.Name` shows the tool's name in code type and sets `translate="no"`. `ToolCall.Content` holds the arguments and the result, such as two `CodeBlock`s.

Docs: https://mantle.ngrok.com/components/ai/reasoning and https://mantle.ngrok.com/components/ai/tool-call
