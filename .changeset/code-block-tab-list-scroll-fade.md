---
"@ngrok/mantle": patch
---

fix(mantle): scroll `CodeBlock.TabList` on overflow instead of wrapping

`CodeBlock.TabList` now scrolls horizontally with an edge fade
([`scroll-fade-x`](https://mantle.ngrok.com/base/scroll-fade#horizontal--scroll-fade-x)
plus `overflow-x-auto`) when its tabs exceed the header width, rather than
wrapping the tab strip onto a second row. `CodeBlock.TabTrigger` gains
`shrink-0 whitespace-nowrap` so each label keeps its intrinsic width under width
pressure. The list reserves room (`-m-1 p-1`) for each trigger's focus ring so
the scroll container never clips it. No API changes — consumers who hand-wired
this on `className` can drop the workaround.
