---
"@ngrok/mantle": patch
---

Add the `focus-ring` utility: the shared focus ring of mantle. It draws a 4px ring in a focus color, in place of the browser outline. Put a state variant before it, such as `focus-visible:focus-ring`. `focus-ring` is the accent ring; `focus-ring-danger`, `focus-ring-warning`, `focus-ring-success`, and `focus-ring-neutral` are the other tones. A `ring-focus-*` class or a `ring-*` width class on the same element overrides the tone or the width. The [Focus Ring](https://mantle.ngrok.com/base/focus-ring) page lists the rules.

The mantle controls now use the utility. Their focus rings do not change, with one exception: the focus ring of a fold toggle in a `CodeBlock` is now the mantle ring, not a 2px outline, and it shows above the adjacent lines.
