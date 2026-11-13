---
"@ngrok/mantle": patch
---

A focused chart takes only the keys and the buttons it uses:

- A chord with Alt, Ctrl, or Meta passes to the browser. Before, a chart moved its point cursor and cancelled the key, so the history shortcuts (Alt or Cmd with the left or right arrow key) did nothing while a chart held focus. Ctrl+Home and Ctrl+End no longer step the cursor; Home and End do.
- Escape, Enter, and Space are cancelled only while a datum is active. With no readout open, Escape now reaches the surface around the chart, so a floating `AppLayout.SidePanel` or a native `<dialog>` closes, and Space scrolls the page.
- A held Enter or Space calls `onDatumActivate` once.
- On `BarChart` with `orientation="horizontal"`, the down and up arrow keys step through the categories, and Page Down and Page Up jump forward and back. The left and right arrow keys still work.
- Only the primary button activates a datum. Before, a middle click called `onDatumActivate`, and so did a right click on a platform that opens the context menu on release. A right or middle press no longer rotates a 3D `ScatterPlot`.
- A click on a chart with a controlled `activeIndex` reports the datum under the pointer in `onDatumActivate`. Before, it reported the controlled datum when the consumer did not echo the index before the release.
