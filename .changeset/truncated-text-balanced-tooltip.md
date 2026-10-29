---
"@ngrok/mantle": patch
---

Balance the lines of the `TruncatedText` tooltip, and drop its help cursor.

- A value a little wider than the tooltip no longer leaves one or two characters alone on the last line.
- A truncated value no longer shows the `help` cursor on hover. The cursor is the default text cursor, like a value that fits.
