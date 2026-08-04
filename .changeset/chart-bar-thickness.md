---
"@ngrok/mantle": patch
---

`BarChart` bars now grow with the category spacing instead of stopping at 24px, so a chart with few categories
no longer reads gap-toothed.

Seven days across a wide card used to paint 24px bars inside a 93px step, which left 69px of air beside every
bar. A bar now fills its slot up to a cap of 60% of one step, floored at the old 24px and ceilinged at 64px:
those seven bars paint about 47px.

- **A dense chart is untouched.** The floor and the fill rule meet at a step of exactly 40px, so every chart
  whose categories sit closer than that paints the pixels it painted before.
- **The ceiling stops the other extreme.** Two categories across a 650px plot would fill 195px each unclamped,
  and a bar that wide reads as a panel rather than a mark.
- **Grouped series split the band as before,** and each bar fills its own slot up to the same cap, so a group
  tightens rather than outgrowing its category.
- **Horizontal bars follow the same rule** on their own band axis.

The thickness reads the step alone, so the same data at the same width always paints the same pixels, and the
curve rises with no jump at either clamp — a row arriving or a container resize can never pop the bars to
another width. `chart/bar-geometry.test.ts` pins the rule and
`chart/bar-thickness.browser.test.tsx` measures the painted bars.

There is no `barSize` prop, and this adds none: bar thickness stays a property of the layout.

Docs: https://mantle.ngrok.com/components/charts/bar-chart#barchartbar
