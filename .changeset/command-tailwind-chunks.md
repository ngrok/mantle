---
"@ngrok/mantle-vite-plugins": patch
---

Scan the `button`, `dialog`, `kbd`, and `separator` chunks for consumers that import `@ngrok/mantle/command`.

`Command` renders the Dialog shell around its palette — whose close control is an `IconButton`, hoisted one level further into the `button` chunk — a Separator between groups, and a Kbd chip for every key in the `MetaKey` it re-exports. Each of those components' class strings is hoisted into its own dist chunk, the chunk lookup is not transitive, and none of the per-component `@source` globs matched for a command-only consumer — so the palette's dialog chrome, its close button, separators, and shortcut chips rendered unstyled with lint, typecheck, test, and build all green.
