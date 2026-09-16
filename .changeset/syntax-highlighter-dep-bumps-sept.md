---
"@ngrok/mantle-server-syntax-highlighter": patch
---

Bump runtime dependencies: `oxc-parser` to 0.150.0.

`oxc-parser` computes the fold ranges for JS, TS, JSX, and TSX code blocks. Version 0.150.0 rejects more invalid syntax, such as `accessor` modifiers on methods, `readonly` on constructors, and return types on constructor overloads. A code block that already compiles with TypeScript folds the same way as before.
