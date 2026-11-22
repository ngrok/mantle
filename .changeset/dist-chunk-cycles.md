---
"@ngrok/mantle": patch
---

Each Phosphor icon that mantle bundles ships in its own chunk. So every `@ngrok/mantle` subpath loads in Node with no bundler, such as in server rendering that keeps `@ngrok/mantle` external, and a bundler still drops each icon that a page never renders. CI now fails when two dist chunks import each other, or when a subpath does not load in Node.
