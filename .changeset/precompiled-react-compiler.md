---
"@ngrok/mantle": patch
---

Ship React Compiler output in the published package. Components and hooks come precompiled with automatic memoization, so consumers get the render-performance win without running the compiler themselves. React 19, which the package already requires, carries the `react/compiler-runtime` import the compiled code uses. The build runs the compiler through `oxc-transform-react`, the Rust port of the React Compiler.

`DataTable` compiles too. TanStack Table v9 keeps its `row`, `column`, and `header` objects stable, so the parts that read state through them (`Header`, `Row`, `HeaderSortButton`, `RowExpandButton`, `ExpandedRow`) now read it inside a TanStack `Subscribe` boundary, as TanStack's React Compiler guide describes. Each boundary also re-runs when `useTable` receives new options. `DataTable.Row` subscribes to the whole table state, so a column's `cell` renderer can keep reading `row.getIsSelected()` and similar methods, and can keep closing over your component's values. `List.VirtualRoot` reads `useVirtualizer` through an opted-out hook and compiles otherwise.

Treat props as immutable. A compiled component memoizes on prop identity, so an object or array mutated in place after you passed it does not re-render the component. This was already the React contract; the compiler now relies on it.

Measured in headless Chromium against a tree of 12 cards with an 8-row table each (288 leaf elements), median time per update, production React:

| Scenario                                                 | Uncompiled mantle | Compiled mantle |
| -------------------------------------------------------- | ----------------: | --------------: |
| Parent re-render, mantle props unchanged, app uncompiled |            1.0 ms |          0.8 ms |
| Parent re-render, mantle props unchanged, app compiled   |            1.0 ms |         <0.1 ms |
| One leaf label changes                                   |            1.0 ms |          0.8 ms |
| Mount, app uncompiled                                    |            2.9 ms |          3.2 ms |
| Mount, app compiled                                      |            2.1 ms |          2.1 ms |
