---
"@ngrok/mantle": patch
---

**Every chart repaints: all eight series colors change, in all four themes.** `BarChart`, `LineChart`,
`AreaChart`, and `ScatterPlot` all paint from the same eight `--color-chart-*` slots. Every slot gets a new
value here. The slot count stays at eight. The token names stay the same, so only the values move.

**What was wrong.** The palette gates measured adjacent pairs only — `chart-1` against `chart-2`, `chart-2`
against `chart-3`, and so on down the order. A chart puts pairs on screen that those gates never looked at:

- a legend lists all eight slots in one column;
- a scatter mark can neighbor any other mark;
- fixed series slots can leave the painted slots non-consecutive.

Over all 28 pairs the shipped palette fell to ΔE 1.90 under simulated color vision deficiency (CVD) in
`light` and in `dark`, 1.55 in `light-high-contrast`, and 1.71 in `dark-high-contrast`. At 1.90, `chart-1`
and `chart-7` are one color to a deuteranope. A two-series chart on those slots reads as a single series.

**What it is now.** Each theme declares its own eight colors. All 28 pairs clear the ΔE 15 floor for
full-color vision and the ΔE 8 target under simulated CVD. The worst pair in any theme measures 9.55. The
gate suite runs the all-pairs comparison in every theme from here on. It also holds each theme to the
contrast that theme measures today, rather than to the flat 3:1 minimum.

| Theme                 | All-pairs ΔE, full color | All-pairs ΔE, simulated CVD | Lowest contrast   |
| --------------------- | ------------------------ | --------------------------- | ----------------- |
| `light`               | 7.53 → 15.475            | 1.90 → 9.580                | 3.584:1 → 3.610:1 |
| `dark`                | 7.53 → 15.072            | 1.90 → 9.551                | 3.625:1 → 3.652:1 |
| `light-high-contrast` | 6.32 → 15.145            | 1.55 → 9.617                | 3.651:1 → 3.696:1 |
| `dark-high-contrast`  | 8.45 → 15.054            | 1.71 → 9.572                | 6.762:1 → 6.763:1 |

Contrast rose a little in three themes and held in the fourth, so no theme regressed. No lightness band moved
or widened to fit a new color. `light`, `dark`, and `light-high-contrast` keep every slot inside their band.
`dark-high-contrast` keeps the above-the-ceiling waiver it already carried, with its marks between lightness
0.672 and 0.898. A slot also keeps its family across the four themes: the largest hue drift for any slot is
11.32 degrees. Every literal sits inside the sRGB gamut, so no browser clamps a mark to a color nobody
measured.

**The overflow gray is the one distance that got worse.** Every series past the eighth wears
`--color-chart-other`. In `dark`, the closest categorical slot to that gray falls from ΔE 4.86 to 3.81 under
simulated CVD. The other three themes rise: `light` to 6.24, `light-high-contrast` to 8.72, and
`dark-high-contrast` to 3.12. No palette closes the gap. The overflow has to be achromatic so it reads as
"not a category", and the dichromacy simulations strip chroma, so a gray always lands near a mark of its own
lightness. The gate suite now records each theme's distance, so it cannot shrink further unseen. Keep folding
the tail into one "Other" series rather than painting a ninth.

**Slot 6 changes family, from orange to magenta.** Orange sits between slot 4 and slot 8 on the hue circle.
Deuteranopia pulls those three toward one another, and that span cannot carry three marks. Magenta near hue
334 sits away from both. That one substitution is what buys the all-pairs result. The families in slot order
now read: blue, green, pink, red-orange, teal, magenta, violet, amber. Slot 4 spans hue 31 in `light` to hue
43 in `dark-high-contrast`, so it reads as a red on a white card and as a burnt orange on a black one.

**The slots are bespoke `oklch()` literals now, not aliases of Tailwind ramp steps.** A published ramp step
lands where its own designer put it. The ramps cannot supply eight all-pairs-safe colors: they top out at
seven in `dark` and six in `dark-high-contrast`. Each theme file therefore carries its own eight literals.
One consequence for anyone who re-tunes mantle's ramps: a chart slot no longer follows a ramp step. A
consumer who redeclares `--color-blue-500` no longer moves `chart-1`. Override the chart token itself
instead.

**To retheme one built-in slot, redeclare the token on the chart's `Root`:**

```tsx
<BarChart.Root className="[--color-chart-1:var(--color-brand)]" data={monthlySpend} xKey="month">
	<BarChart.Bar dataKey="endpoints" label="Endpoints" />
</BarChart.Root>
```

The engine resolves every token through a probe inside `Root`, so the declaration wins for that chart and
leaves every other chart on the page alone. For one series rather than one slot, pass the `color` prop:

```tsx
<BarChart.Bar dataKey="requests" color="var(--color-brand)" />
```

Either way, measure your own color against the eight slots. The gates validate the palette mantle ships, not
the colors you put in its place.

Docs: [Chart color tokens](https://mantle.ngrok.com/components/charts/bar-chart#chart-color-tokens).
