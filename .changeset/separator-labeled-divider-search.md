---
"@ngrok/mantle": patch
---

Each component docs page now has search aliases: the names that other UI libraries use for the same part, such as `data grid` for `DataTable`, `date picker` for `Calendar`, and `tag` for `Badge`. `dist/agent.json` and `dist/llms.txt` include them, so an agent that searches with the name from another library finds the mantle part.

The `Separator` `@useWhen` now says to wrap a text label and separators in a `HorizontalSeparatorGroup` to make a divider with a label in the middle or at one end. Agents that search the manifest for a labeled divider now find `Separator`.
