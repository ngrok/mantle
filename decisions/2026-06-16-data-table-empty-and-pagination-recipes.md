# DataTable Empty States & Pagination: Canonical Recipe (not a built-in slot)

## Status

Decided — **Option A (canonical recipe + JSDoc)**. 2026-06-16.

## Context

Every list-style `DataTable` needs two things the docs under-taught:

1. **Two empty states** — "no data yet" (informational, optional create action) vs.
   "no results for the active filter/search" (needs a `Clear filters` way out).
2. **Pagination** — a page-size dropdown plus previous/next, wired to the table.

The docs previously shipped only bare `<DataTable.EmptyRow>No results.</DataTable.EmptyRow>`
and a hand-rolled `<Button>`-based prev/next recipe. Because the source JSDoc `@example`
blocks feed the `.d.ts`, `llms.txt`, and `/api/components.json` agent manifest (see
[#1239](https://github.com/ngrok/mantle/pull/1239)), those examples are **normative** —
coding agents reproduce them verbatim. A downstream migration of ~57 tables copied exactly
the bare-string empty and hand-rolled pagination the docs showed.

The building blocks already exist and compose cleanly: `Empty` (centers itself) drops into
`DataTable.EmptyRow` (auto `colSpan`), and `CursorPagination` (`Buttons` / `PageSizeSelect` /
`PageSizeValue`) wires to TanStack's `getCanNextPage()` / `nextPage()` / `setPageSize()`. The
gap was the **integration documentation**, not missing primitives.

## Options considered

- **A — Canonical recipe + JSDoc.** Document the two-state empty pattern and the
  `CursorPagination`-wired pagination in the DataTable/Empty/Pagination docs and, critically, in
  the `data-table` source JSDoc `@example` blocks so the regenerated agent surface teaches them.
  No new public API.
- **B — A documented (un-exported) `<DataTableEmpty>` recipe component** taking
  `isFiltered` + `onClearFilters` + no-data content. One shape, still copy-paste.
- **C — A built-in slot/prop**, e.g. `<DataTable.Empty isFiltered onClearFilters>` and
  `<DataTable.Pagination table>` (or a `renderEmpty` / `emptyState` prop). Most ergonomic,
  largest API surface.

## Decision

**Option A.** It fully addresses the actual failure (agents copy what the docs show) by fixing
the highest-leverage surface — the source JSDoc — while staying inside the project's conventions:

- Empty-state content varies widely (icon, title, copy, optional actions). A slot/prop with
  `isFiltered` / `onClearFilters` bakes a specific two-state _policy_ into the component and is
  exactly the kind of abstraction that accumulates flags and mode parameters that
  [CONVENTIONS.md](../CONVENTIONS.md) warns against ("prefer duplication over the wrong
  abstraction"; "don't extract until 3+ uses with the same shape and reason to change";
  "prefer composition over generalization").
- The pieces already compose (`Empty` in `EmptyRow`; `CursorPagination` over the table
  instance). The fix is documentation, not new surface.

Pagination (C) is more defensible than empty states (C) because the wiring is mechanical and
uniform, but it still couples `DataTable` to `CursorPagination` and grows the public API for
~15 lines of copy. Deferred under YAGNI; revisit if a concrete, repeated, identical need
emerges across consumers.

## Consequences

- DataTable docs gain an "Empty states (no data vs. no results)" recipe (runnable, with a
  working `Clear filters` reset) and a `CursorPagination`-based "Pagination controls" recipe
  (runnable page-size dropdown). Empty and Pagination docs each gain a "Within a data table"
  example and cross-link DataTable.
- The `data-table` source JSDoc `@example` on `DataTable` now teaches the two-state `Empty`
  pattern and `CursorPagination`; the regenerated `components-surface.json` snapshot reflects it.
  One minimal bare-string empty example is kept for the trivial case.
- No `@ngrok/mantle` runtime API change — only JSDoc/docs. Shipped as a `patch`.
