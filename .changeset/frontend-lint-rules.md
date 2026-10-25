---
"@ngrok/mantle": patch
---

`isApplePlatform` returns `false` during a server render. Before this release, it read the `navigator` global, which Node 21 and later also define, so a server on macOS could report an Apple platform and the client could then hydrate a different shortcut hint.

The source now passes the stricter lint rules that the ngrok frontend repo uses. The other changes are internal and do not change behavior.

Tailwind classes in the source use their canonical form. The default `preferredWidth` of `Sheet.Content` is now spelled `sm:max-w-120`, which is the same width as `sm:max-w-[30rem]`.
