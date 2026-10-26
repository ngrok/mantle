---
"@ngrok/mantle": patch
---

`TruncatedText` clips its head and keeps its tail again. In 0.92.0, Tailwind compiled the head and tail `max-width` rules to invalid CSS, and the browser dropped them. A long value overflowed its box, so a sibling such as the `IdTag` copy button painted over the text.
