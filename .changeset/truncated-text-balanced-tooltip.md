---
"@ngrok/mantle": patch
---

Add a `head` prop to `TruncatedText`, fit its tooltip to the value, and drop its help cursor.

- `head` is the most graphemes that show before the ellipsis. A value longer than `head + tail` graphemes always clips to that shape, and the root shrinks to fit. For an ngrok resource ID, `head={id.indexOf("_") + 1}` keeps the type prefix: `mem_…A8KImPbQ`. The component measures the lead, so a caller needs no `ch` math and no monospace font.
- The tooltip is up to 24rem wide, so a resource ID fits on one line. A longer value no longer leaves one or two characters alone on the last line: the lines have near-equal length, and the tooltip narrows to the longest line.
- A truncated value no longer shows the `help` cursor on hover. The cursor is the default text cursor, like a value that fits.

See https://mantle.ngrok.com/components/data-display/truncated-text.
