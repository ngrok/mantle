---
"@ngrok/mantle": patch
---

Add `Empty.Scrim`, a soft wash that sits behind an empty state's content so the copy stays readable over a busy
backdrop.

```tsx
<div className="relative w-full">
	<BarChart.Root data={placeholderUsage} xKey="day" decorative>
		<BarChart.Bar dataKey="value" />
	</BarChart.Root>
	<Empty.Root className="absolute inset-0 m-auto h-fit w-fit">
		<Empty.Scrim />
		<Empty.Title>No usage yet</Empty.Title>
		<Empty.Description>
			<p>Traffic will appear here once your endpoints start receiving requests.</p>
		</Empty.Description>
	</Empty.Root>
</div>
```

Compose it as the first child of `Empty.Root` whenever the empty state sits over anything but a flat surface —
a decorative chart, an image, a pattern. It paints an ellipse of the surface color that fades to nothing before
the container's edge.

The scrim is paint and nothing else. It is `aria-hidden`, never a tab stop, inert to pointer events, and it
takes no space. Those hold even when you spread your own values over the part, so a stray `tabIndex` cannot
strand focus on a shape a screen reader will not announce. It takes no children, because content nested inside
an `aria-hidden` subtree goes missing from the accessibility tree.

**The reason is measured.** `Empty.Description` sits on `text-muted`, which measures 4.88:1 on a bare light
card — 0.38 over the 4.5:1 floor for 14px text. Anything tinted under that text spends the headroom and drops
the description under WCAG AA. A decorative chart at 70% opacity leaves the worst chart slot at 2.74:1 in the
light theme. The scrim restores the flat surface locally, which hands the message back the 4.88:1 it would
measure on a bare card.

- **`--empty-scrim-color` sets the color the wash paints**, and defaults to `var(--background-color-card)`. Set
  it when the empty state sits on another surface — `var(--background-color-popover)` inside a popover.
- **`Empty.Root` now carries `relative isolate`.** The scrim paints at `-z-10`, and without a stacking context
  on the root that would drop it behind the backdrop the empty state is layered over.

Docs: https://mantle.ngrok.com/components/feedback/empty#over-a-backdrop
