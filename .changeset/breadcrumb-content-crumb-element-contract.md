---
"@ngrok/mantle": patch
---

`routeBreadcrumb.content` now documents what a content crumb must render: a host element at its root, never bare text. `Breadcrumb.List` renders an `<ol>`, so the crumb's outermost node is a direct child of a list. A bare string there is a text node React removes by itself, and a browser translation engine has reparented it first, so the removal throws and the page goes blank. No wrapper can fix it from mantle's side, because a `Breadcrumb.Item` wrapper would nest an `<li>` in an `<li>`.

The JSDoc on the `content` factory and on the `Crumb` union both carry the contract, and the breadcrumbs recipe states it above every content-crumb example. The type still takes `ReactNode`; narrowing it to `ReactElement` is a breaking change and waits for the next `minor`.
