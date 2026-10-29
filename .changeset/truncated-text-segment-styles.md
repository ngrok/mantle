---
"@ngrok/mantle": patch
---

Document how to style the head and the tail of `TruncatedText`. Style each segment from the root with `*:data-[slot=truncated-text-head]:` and `*:data-[slot=truncated-text-tail]:` classes. The ellipsis takes the head's color, so `*:data-[slot=truncated-text-head]:text-muted` mutes an ID's type prefix and the ellipsis together. A value no longer than `tail` has an empty head, so its tail draws the ellipsis in the tail's color. Add `data-truncated:` first to color the segments only while the value overflows.
