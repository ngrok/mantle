---
"@ngrok/mantle": patch
---

More static parts are now React Server Components. They skip the React Compiler, and a server component renders them to HTML with no JavaScript for the browser:

- `AppLayout`: `Root`, `Notice`, `Workspace`, `Content`, `Header`, `HeaderStart`, `HeaderContent`, `HeaderActions`, `Body`, `SidePanelBody`, and `SidePanelFooter`.
- `Sheet`: `Body`, `Header`, `Footer`, `TitleGroup`, and `Actions`.
- `Alert`: `Content`, `Title`, and `Description`. `Alert.Root` sends only its context provider.
- `Breadcrumb`: `Root`, `Item`, `Link`, `Label`, `Page`, and `Skeleton`. `Breadcrumb.List` sends only the code that keeps the current page in view.
- `CodeBlock`: `Body`, `Header`, and `Title`.

On a server page with these parts, the browser gets less mantle JavaScript (gzip): the `AppLayout` shell 0 KB (was 25.2 KB), the `Sheet` layout parts 0 KB (was 19.5 KB), a static `Alert` 10.5 KB (was 18.0 KB), the `CodeBlock` static parts 11.0 KB (was 21.2 KB), and a `Breadcrumb` 11.3 KB (was 12.5 KB).

The props, refs, data attributes, and rendered HTML of each part do not change.
