---
"@ngrok/mantle": patch
---

Add `getFilterConjunction` to `@ngrok/mantle/query-filter`. It reads a query as one AND group, for a backend that runs only that, such as a list API that takes one value list for each key. It returns the clauses of the AND group, each term with its effective negation, and a problem for each `OR` and negated group that one AND group cannot hold. Pass `{ or: "same-key" }` when the backend runs `status:404 OR status:500` as one value list. Migration 0032 now uses it in place of a loop over `getEffectiveNegations`.

Docs: https://mantle.ngrok.com/utils/query-filter#a-backend-that-runs-one-and-group
