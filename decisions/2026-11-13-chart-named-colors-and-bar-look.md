# Chart named colors and one bar look

**Date:** 2026-11-13
**Status:** Accepted
**Supersedes:** the eight validated categorical slots, `seriesSlot`, and the slot-paired glyphs of [2026-07-18-canvas-chart-family.md](./2026-07-18-canvas-chart-family.md); the bar geometry of [2026-11-11-chart-svg-renderer.md](./2026-11-11-chart-svg-renderer.md).
**Evidence:** the Agents v4 prototype (ngrok-private/frontend PR #4656, `agents-card-list.tsx`, `agent-stacked-bar-chart.tsx`, `agent-graph-color.ts`); `chart/tokens.test.ts` and the palette-gate math in `chart/palette-gates.ts`, run over `mantle.css` in both themes.

## Context

The Agents v4 page is the shape the charts must serve: 20 cards per page, each with a stacked In/Out bar chart in neutral grays, In hatched, and a tooltip. Next to that prototype, mantle's bars looked wrong (thin bars, 4px caps on every segment, a zero rule, a rounded-up axis) and its colors came from an automatic palette that design could not steer. The design lead judged the result "really bad" and asked for intentional colors from mantle's own color vocabulary.

## Decision

1. **Bars have one look, Ricky's.** A bar fills its step except a 2px gap (1px, then none, as the step narrows). The 60% / 24px / 64px thickness cap still holds wide steps. A bar or a whole stack rounds both ends at 2px. Stacked segments are 1px apart. A chart with no axis and no grid runs edge to edge, keeps 12% headroom over its tallest bar, and draws no zero rule. A stacked tooltip leads with a Total row. There is no prop to opt out.
2. **Every series names its color.** `color` is required on every series part and takes mantle's `Color` (the names `Badge` takes) or a CSS string. Automatic assignment, `seriesSlot`, the `chart-1` to `chart-8` and `chart-other` tokens, and the slot-paired glyphs are gone. A series with no `shape` wears the circle.
3. **One token per name, 500 in dark and 600 in light.** `--color-chart-<name>` aliases that color's 500 step in dark mode and its 600 step in light mode. One step everywhere was the goal: 500 read washed out on white (9 hues under 3:1), and 600 read pastel on the dark card (lightness 0.70 to 0.83). Ricky's prototype already ran light mode darker than dark mode. The color-stop work planned next may move these steps.
4. **A texture is a light tint of its color.** The ground mixes 25% of the series color into the card, and the marks ink in the full color. A solid series and a textured series of one color read as a pair, so the In/Out card is `color="neutral"` twice with `texture="hatch"` on In.
5. **Design first, then as close to accessible as possible.** The token test records which names sit under WCAG 2.2 SC 1.4.11's 3:1 (light mode: yellow at 2.94:1) instead of failing on them. The docs carry the SC 1.4.11 rules, its exemptions (visible labels or a visible table, a darker edge), and the guidance to keep a chart to 8 series: the top 7, plus an "Other" series in `neutral`.

## Consequences

- A breaking minor with a migration guide and codemod `0014`. The codemod renames tokens and replaces `seriesSlot`; the type checker names each series that needs a `color`.
- Mantle no longer guarantees that any set of colors stays apart for color-blind readers. The bespoke eight held a worst pair of ΔE 15.07 (normal vision) and 9.55 (simulated protanopia and deuteranopia). The best 7 of the scale steps reach about 7.2 and 6.6. The docs tell authors to vary lightness as well as hue and to add a texture or shape.
- `palette-gates.ts` keeps its separation math with no caller in the token test. The color-stop work can use it again, or a later change deletes it.
