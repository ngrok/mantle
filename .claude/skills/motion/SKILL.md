---
name: motion
description: "Design, review, and verify an animation or transition in mantle so it feels immediate, stays still where it should, and respects reduced motion. Use WHENEVER you add or change a transition, an animation, a `starting:` or `data-state` motion class, an enter or exit, a height or slide, or the Web Animations API, and when a user says motion feels janky, snappy, jarring, or slow. Skip it for a color-only hover change."
---

# Motion

[docs/motion.md](../../../docs/motion.md) holds the rules and the tokens. This file is how to apply them and how
to prove the result.

## Before you write the motion

Answer each question. Each answer maps to a rule in docs/motion.md.

1. What change does the motion explain? If nothing, add no motion.
2. What must stay still? Name the trigger, the header, and the control, and make sure no state changes their size
   or padding.
3. Can the box animate its own size? If not (`<tr>`, `display: contents`), slide the neighbors with FLIP.
4. What is the exit? Write it as the mirror of the enter, with its parts at the same time.
5. What happens on a second input during the motion? It must retarget from the current value.
6. What does a reduced-motion user see? The end state, at once.

## Patterns

- **Enter:** `starting:opacity-0 starting:-translate-y-1 motion-safe:transition-[opacity,translate]
  motion-safe:duration-200 motion-safe:ease-out-strong`.
- **Exit with a CSS state:** keep the element mounted, set a `data-closing` attribute and `inert`, and fade with
  `data-closing:opacity-0 motion-safe:data-closing:duration-150`. Unmount on a timer.
- **Height:** `h-0 overflow-hidden opacity-0 [interpolate-size:allow-keywords] transition-[height,opacity]
  data-state-open:h-auto data-state-open:opacity-100` on an unpadded viewport. Padding goes on a child, or the
  box cannot reach zero height.
- **FLIP slide:** record `offsetTop` for each sibling, commit, then in a layout effect call
  `row.animate([{ translate: \`0 ${old - new}px\` }, { translate: "0 0" }], { duration: 200, easing })`.
- **Retarget in JavaScript:** read `getComputedStyle(el).translate`, cancel the running animations, and animate
  from that value.

## Prove it

Classes prove nothing: unit tests run without Tailwind, and class assertions are banned. Sample the computed
style in Chromium with Playwright against `pnpm exec react-router dev` in `apps/www`, and report the numbers:

```js
const samples = await page.evaluate(async () => {
	const el = document.querySelector("[data-slot~='accordion-content']");
	document.querySelector("[data-slot~='accordion-trigger']").click();
	const out = [];
	for (let i = 0; i < 6; i++) {
		await new Promise((r) => setTimeout(r, 40));
		out.push([el.getBoundingClientRect().height, getComputedStyle(el).opacity]);
	}
	return out;
});
```

Check each of these:

- The curve is `cubic-bezier(0.23, 1, 0.32, 1)` (read `transitionTimingFunction`).
- The values move in one direction and settle; there is no jump when React commits.
- Each element that must stay still keeps its box in every sample.
- A second input mid-motion moves the values back without a jump.
- With `reducedMotion: "reduce"` on the page, `transitionDuration` is `0s` and the end state shows at once.
- Measure positions relative to the element's own container: scroll anchoring moves an element that is far
  outside the viewport.

In unit tests, assert the behavior around the motion: the state attribute, `inert`, the accessible name, the
delayed unmount (with `waitFor` or fake timers), and the immediate path under `mockMatchMedia` for reduced motion.
