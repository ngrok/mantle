---
"@ngrok/mantle": patch
---

Make each `StatusStrip.Segment` smaller in the HTML. The segment paint moves to one `status-strip-segment` utility in `mantle.css`, so each segment carries one short class in place of about 400 bytes of classes. Only a segment with a share between 0 and 1 writes an inline style. A server-rendered list of 50 strips of 30 segments goes from 727 KB to 172 KB of HTML (6.0 KB to 1.8 KB gzipped). The paint does not change. A `bg-*` class on a segment still replaces the fill above 0. Set `--status-strip-fill` or `--status-strip-track` on one segment to give it its own color, such as a threshold color.
