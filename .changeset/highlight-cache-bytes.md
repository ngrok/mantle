---
"@ngrok/mantle-server-syntax-highlighter": patch
---

The highlight cache also holds at most 32 MB of code and highlighted HTML (`mantleHighlightCacheMaxBytes`), not only 1,000 entries. 1,000 entries of a 300-line block held about 200 MB of server heap; the same stream of blocks now holds about 27 MB.
