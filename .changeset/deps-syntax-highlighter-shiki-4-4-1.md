---
"@ngrok/mantle-server-syntax-highlighter": patch
---

Bump the `shiki` runtime dependency from 4.3.1 to 4.4.1.

Shiki 4.4.0 updates its bundled grammars and themes, so the tokens and colors in highlighted output can
shift for some languages. It also fixes language detection, so a document's frontmatter segments now read
as YAML. Shiki 4.4.1 updates Shiki's own dependencies and changes no API.
