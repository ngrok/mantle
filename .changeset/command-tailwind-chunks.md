---
"@ngrok/mantle-vite-plugins": patch
---

Scan the `dialog`, `kbd`, and `separator` chunks for consumers that import `@ngrok/mantle/command`.

`Command` renders the Dialog shell around its palette, a Separator between groups, and a Kbd chip per key in `Command.SearchTrigger`'s `⌘K` hint. Each of those components' class strings is hoisted into its own dist chunk, which none of the per-component `@source` globs matched for a command-only consumer — so the palette's dialog chrome, separators, and shortcut chips rendered unstyled with lint, typecheck, test, and build all green.
