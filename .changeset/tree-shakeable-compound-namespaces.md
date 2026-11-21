---
"@ngrok/mantle": patch
---

Compound components now tree-shake: a bundle keeps only the parts an app reads. `DropdownMenu`, `Dialog`, `Field`, and the other 45 compound namespaces are ES module namespaces instead of objects. Imports, call sites, types, and editor hovers stay the same: `import { DropdownMenu } from "@ngrok/mantle/dropdown-menu"` and `<DropdownMenu.Item>` read as before.

In a Vite 8 build, a page that renders `Button` with a few parts each of `DropdownMenu`, `Tabs`, `Accordion`, `Card`, and `Dialog` ships 154.5 KB of mantle JavaScript instead of 185.9 KB (minified). `Field` with `Item`, `Label`, and `Control` drops from 124.2 KB to 38.0 KB, because the popover behind `Field.Help` no longer comes along.

A namespace is now a read-only module namespace object. Spreading or iterating one still works. Assigning to one of its parts (`Dialog.Root = …`) now throws at runtime, and TypeScript does not flag it.
