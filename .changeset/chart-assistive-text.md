---
"@ngrok/mantle": patch
---

The screen-reader text of a chart now matches what the chart shows:

- On a time scale, each row header of the data table holds the formatted date in `<time dateTime>`, and `CopyButton` writes ISO 8601, for a `Date`, an epoch number, and a date string alike. Before, an epoch number read as `1,784,332,800,000`.
- On a linear scale, a row whose x has no text form (`null`, a missing key, `NaN`, or an infinite number) shows an em dash in the table, as its value cells do. Before, it read `null`, `undefined`, `NaN`, or `∞`.
- An announcement follows a keyboard step and nothing else. Before, each data update announced the datum under a parked keyboard cursor again, and updates faster than 120 ms kept a real step silent.
- The chart announces a step to a datum that reads the same as the last one.
- An announcement uses the `labelFormat` and `valueFormat` of the `Tooltip` part when they return a string or a number, so a unit such as `120ms` reaches a screen reader. A stacked chart announces the Total first, as the tooltip shows it.
