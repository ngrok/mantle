---
"@ngrok/mantle": patch
---

`DataTable.ActionCell` and `DataTable.ActionHeader` now render `children` inside a label span: `data-table-action-cell-label` and `data-table-action-header-label`. Both cells hold a sticky-column indicator beside `children`, so a bare text child was never a lone child. On a page a browser translation engine had translated, the removal React runs when the content changes shape or goes away raised `NotFoundError` and blanked the page. A placeholder cell that gains an action button, and an `ActionHeader` whose `children` fall back to the built-in `sr-only` label, both took that path.

Moving the indicator after `children` cured its own mount and nothing else, so the 2026-08-04 guarantee for `ActionHeader` was narrower than the docs stated. The label span covers the removal and the type swap the move never reached.

Both spans are `display: contents`, so no layout moves. The two slots are public API, and the docs page lists each beside its cell.
