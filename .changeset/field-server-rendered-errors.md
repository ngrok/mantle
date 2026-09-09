---
"@ngrok/mantle": patch
---

`Field.Item`, `Field.Errors`, and `Field.ErrorList` now document when the inferred `"error"` state applies. The inference runs on the client, so it applies after hydration. The server HTML carries the error list. Until the page hydrates, the control is not marked invalid (`aria-invalid="true"`) and has no `aria-errormessage`, and the item has no `data-validation="error"`. For an error that renders on the server, set `validation={messages.length > 0 && "error"}` on `Field.Item`; the explicit state is in the server HTML from the first paint. The docs page gains a "Server-rendered errors" section with that idiom.

`Field.Item` also keeps its context identity stable when `validation` is explicit. Before this change, the first message a `Field.Errors` or `Field.ErrorList` mounted or unmounted rebuilt the context, so `Field.Label`, `Field.Control`, and `Field.Description` re-rendered on that transition. The rendered DOM and ARIA output are unchanged.
