---
"@ngrok/mantle": patch
---

`ToolCall.Root` takes a new `status`, `"requested"`, for a call that the view shows but whose result it will never get. For example, a captured request whose response ended with `finish_reason: "tool_calls"` holds the call but not the result. The row shows a neutral dashed-circle icon and the word "Requested", and `data-status="requested"` styles it. Use `running` while the view still waits for a live result. See [Tool Call states](https://mantle.ngrok.com/components/ai/tool-call#states).

Existing `status` values do not change. If your code maps every `ToolCallStatus` value, such as with `satisfies Record<ToolCallStatus, …>` or an exhaustive `switch`, add a `requested` case.
