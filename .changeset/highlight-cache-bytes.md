---
"@ngrok/mantle-server-syntax-highlighter": patch
---

The highlight cache also holds at most 32 MB of code and highlighted HTML (`mantleHighlightCacheMaxBytes`), not only 1,000 entries. One result larger than 32 MB alone stays until the next highlight. 200 results of a 300-line block held 41 MB of server heap, and now hold 27–28 MB; at 1,000 such results, the old bound allowed about 200 MB.
