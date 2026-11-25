---
"@ngrok/mantle": patch
---

`Table.Head` draws its dividers as a bottom border on the cells of each header row. Before, it used `tr:not(:has(+tr))` and `tr+tr`. With that rule on the page, Chromium restyled about 3,700 elements for each node that a page inserted, such as each update of a streamed answer, even with no table on the page. A one-row head looks the same. In a head with more rows, the divider between two rows moves up by 1px.
