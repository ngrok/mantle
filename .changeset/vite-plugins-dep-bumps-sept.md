---
"@ngrok/mantle-vite-plugins": patch
---

Bump runtime dependencies: `magic-string` to 1.4.1 and `oxc-parser` to 0.150.0.

The `vite` peer dependency floor rises to `^8.3.0`. Consumers still on vite 8.2.x see an unmet-peer warning until they upgrade.

`magic-string` generates the source map for each module the code-block plugin rewrites. Version 1.4.1 encodes mappings incrementally and walks unedited chunks line by line, so the transform uses less peak memory on a large module.

`oxc-parser` 0.150.0 rejects more invalid syntax, such as `accessor` modifiers on methods, `readonly` on constructors, and return types on constructor overloads. A source file that already compiles with TypeScript is unaffected.
