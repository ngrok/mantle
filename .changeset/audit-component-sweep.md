---
"@ngrok/mantle": patch
---

Correct JSDoc across Calendar, Progress Bar, Progress Donut, Radio Group, and Scatter Plot (component audit sweep). No API changes.

- `ProgressBar` and `ProgressDonut`: the `@see` links on `Root`, `Indicator`, and both namespace members pointed at `#api-progress-bar*` / `#api-progress-donut*` anchors that no longer exist on their docs pages. They now resolve to the real `#progressbarroot`, `#progressbarindicator`, `#progressdonutroot`, and `#progressdonutindicator` API-reference anchors.
- `Calendar`: dropped the stale `#api-calendar` fragment so the `@see` link points at the component's docs page.
- `ScatterPlot`: the Composition tree omitted `ScatterPlot.CopyButton`, which the component has shipped as a namespace member — the tree now matches the docs page.
- `RadioGroup`: added the missing "Rich option layout (Choice)" tree to the Composition example so the JSDoc matches the five layouts documented on the docs page.
