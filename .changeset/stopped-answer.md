---
"@ngrok/mantle": patch
---

`Markdown` takes `truncated` for an answer that ended before it finished, such as one the reader stopped or one whose stream failed. Its unfinished syntax at the end stays closed, as it rendered while streaming, so `**bol` stays bold after the stop and after a reload. Set it from the answer's stored status.

`Conversation.Root` takes `stopped`. When the reader stops an answer, screen readers hear "Answer stopped." in place of "Answer ended.". The chat recipe sets both.
