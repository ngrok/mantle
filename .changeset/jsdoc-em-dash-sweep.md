---
"@ngrok/mantle": patch
"@ngrok/mantle-server-syntax-highlighter": patch
"@ngrok/mantle-vite-plugins": patch
---

The JSDoc in the built types and the package READMEs no longer use em-dash asides: each one is now a parenthetical, a colon, or a separate sentence. Editor hover text and `llms.txt` now read the same as the docs pages.

The screen-reader caption on a chart's data table now reads `Visitors by month: chart data.` instead of `Visitors by month — chart data.` An accessible-name query in a test that matches the old caption needs the new text.
