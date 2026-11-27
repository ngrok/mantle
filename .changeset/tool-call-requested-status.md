---
"@ngrok/mantle": patch
---

`ToolCall.Root` takes a new `status`, `"requested"`, for a call whose result is not in the current view. For example, a captured request whose response ended with `finish_reason: "tool_calls"` has its result in the next request. The row shows a neutral dashed-circle icon and the word "Requested", and `data-status="requested"` styles it. Before, an app had to show such a call as `interrupted` or `done`, and both were wrong. No migration is necessary; the other values do not change.
