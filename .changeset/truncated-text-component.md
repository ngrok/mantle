---
"@ngrok/mantle": minor
---

Add `TruncatedText`, which renders one long opaque value (a URL, a resource ID, an image reference, a token) on a single line. When the value overflows its container, the head clips with one ellipsis and the last `tail` graphemes (8 by default) stay visible, so the part that tells two values apart never disappears. When the value fits, it renders plain. A tooltip shows the full value on hover only while the value overflows. Like every mantle tooltip, it needs a `TooltipProvider` ancestor. The root carries `user-select: all`, so one click selects the whole value across both segments, and a copy yields the full string with no ellipsis and no line break. The root, the head, and the tail stamp `data-slot="truncated-text"`, `"truncated-text-head"`, and `"truncated-text-tail"`. While the value overflows, the root stamps `data-truncated`. The root carries `translate="no"` by default. Pass `asChild` to render the value inside another element, such as a `<code>`. Import it from `@ngrok/mantle/truncated-text`.

Docs: https://mantle.ngrok.com/components/data-display/truncated-text
