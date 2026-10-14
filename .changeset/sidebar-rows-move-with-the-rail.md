---
"@ngrok/mantle": patch
---

`Sidebar` rows now move with the rail. A `Sidebar.ItemButton`, a `Sidebar.SearchTrigger`, a `Sidebar.SwitcherTrigger`, a `Sidebar.Separator`, and `Sidebar.Body`'s trailing padding used to take their collapsed or expanded shape on the first frame of a toggle, so the current row snapped to full width while the rail was still 52px wide and then grew with it. Each now transitions its width, padding, and margin on the rail's own 200ms linear clock, so the row and the rail grow and shrink together, and a second toggle mid-flight reverses from where the first one got to. A collapsing row clips its label with no ellipsis, so the narrowing shows no shimmer of dots. The transitions honor `motion-reduce:` and hold until one frame after hydration, the way the rail's width transition does, and a merged `transition-none` or `duration-*` replaces them through tailwind-merge.
