---
"@ngrok/mantle": patch
---

Make each `StatusStrip.Segment` smaller in the HTML. The segment paint moves to one `status-strip-segment` utility in `mantle.css`, so each segment carries one short class in place of about 400 bytes of classes. A server-rendered list of 50 strips of 30 segments goes from 727 KB to 196 KB of HTML (6.0 KB to 2.1 KB gzipped). The paint does not change, and a consumer class on a segment still wins over it. Set `--status-strip-fill` or `--status-strip-track` on one segment to give it its own color, such as a threshold color.
