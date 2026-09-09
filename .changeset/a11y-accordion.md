---
"@ngrok/mantle": patch
---

`Accordion` collapsed content now leaves the accessibility tree and the tab order in every browser, as the docs state. In browsers that support `hidden="until-found"`, nothing changes: the content carries that attribute and find-in-page can still reveal it. In other browsers, and in the server HTML, the collapsed `Accordion.Content` now carries `inert`. Before this change those browsers kept the collapsed content, and any buttons or links inside it, focusable and readable while it was clipped to zero height.

`Accordion.Trigger` now carries `aria-controls`, and `Accordion.Content` carries the matching `id`, as the WAI-ARIA disclosure pattern requires. `Accordion.Item` generates the id so the pair matches in the server HTML, and `id` is no longer a prop on `Accordion.Content`.
