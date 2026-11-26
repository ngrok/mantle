---
"@ngrok/mantle": patch
---

An open `AppLayout.SidePanel` now collapses an expanded `Sidebar.Root` below the lane your app sets in `@theme` with `--container-side-panel-lane`. Before, the collapse stayed at the default 56.5rem while the panel floated at your lane, so a wider lane left the sidebar and the panel out of step. `mantle.css` writes the resolved lane to a private `--_side-panel-lane` on `:root`, and the panel reads it once when it mounts.

`Markdown` takes `truncated` for an answer that ended before it finished, such as one the reader stopped or one whose stream failed. Its unfinished syntax at the end stays closed, as it rendered while streaming, so `**bol` stays bold after the stop and after a reload. Set it from the answer's stored status.

`Conversation.Root` takes `stopped`. When the reader stops an answer, screen readers hear "Answer stopped." in place of "Answer ended.".

The chat recipe sets both.
