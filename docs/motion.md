# Motion

These are the rules for each animation and transition in mantle. They come from Emil Kowalski's animation
guidance, cut to the rules mantle uses. The `motion` skill applies them; this file is the normative copy.

Motion explains a change: where an element came from, where it went, and what moved to make room. Motion that
explains nothing is noise. Leave it out.

## Rules

1. **Ease out, strongly.** Use `ease-out-strong` (`cubic-bezier(0.23, 1, 0.32, 1)`) for each element that enters,
   exits, or changes shape. It moves most of the distance at once and then settles, so the UI answers the input
   at once. Tailwind's `ease-out` is too shallow at 200ms. Never use `ease-in` for UI: a slow start reads as lag.
   Use `linear` only for a progress bar or a spinner.
2. **Keep it short.** Use 200ms to enter and to change shape, and 150ms for an exit fade. UI that answers an input
   never runs longer than 300ms.
3. **Move a short distance.** Settle 4px, not a full height. Never start from `scale(0)`; start from a value near
   the end value.
4. **Keep the control still.** The trigger, the toggle, and the header keep one size in each state. Only the
   content that changes moves. Never animate a trigger's padding to make room for its content.
5. **Fade with size.** Content that grows or shrinks also fades, so it never shows clipped at full opacity.
6. **Move the neighbors when a box cannot animate.** A `<tr>` cannot animate its height. Slide the rows below it
   with `translate` instead (FLIP): record their offsets, commit the change, then animate each moved row from its
   old offset to its new one.
7. **Mirror the exit.** An exit uses the same curve and the reverse path of its enter. Run the parts of an exit at
   the same time, not in sequence: a fade, then a gap, then a slide reads as a snap. Keep the element mounted
   until its exit ends. End the wait with a timer, not `transitionend`: a hidden tab or an interrupted
   transition never fires the event.
8. **Make it interruptible.** Prefer a CSS transition to a keyframe animation: a transition retargets from its
   current value. In JavaScript (the Web Animations API), start a new animation from the current computed value.
   Never `reverse()` an ease-out animation: it plays as a slow ease-in.
9. **Enter without JavaScript.** Use `@starting-style` (the `starting:` variant) for the state before an element
   mounts. Do not keep a "mounted" flag in React state for an enter.
10. **Change state first.** `aria-expanded`, the accessible label, the icon, and focus change on the input, not
    when the motion ends. An element that exits gets `inert` at once, so keyboard and screen-reader users never
    reach it.
11. **Respect reduced motion.** Gate each movement with `motion-safe:` or `motion-reduce:transition-none`. In
    JavaScript, check `getPrefersReducedMotion()` and apply the end state at once. A color change may stay.
12. **Measure it.** Prove motion in a real browser, not by reading the classes. See the `motion` skill.

## Tokens

| Token             | Value                            | Use                            |
| ----------------- | -------------------------------- | ------------------------------ |
| `ease-out-strong` | `cubic-bezier(0.23, 1, 0.32, 1)` | Enter, exit, and shape change. |
| `duration-200`    | 200ms                            | Enter and shape change.        |
| `duration-150`    | 150ms                            | Exit fade.                     |

`@theme inline` emits no CSS variable for `ease-out-strong`. JavaScript that needs the curve keeps a copy of the
value with a comment that names the token.

## Reference implementations

- `Accordion`: a still trigger, and content that eases its height and opacity open.
- `DataTable` expand and collapse: `starting:` for the enter, a FLIP slide of the rows below, and an exit that
  fades the rows while the rows below slide over them.
- `Sidebar`: a width transition on `ease-out-strong`.
- `ThemeSwitcher`: a view transition that animates `clip-path` on `::view-transition-new(root)` with the Web
  Animations API. While a view transition runs, the browser sends each click to `<html>`, so the switcher
  ends the transition on a click and forwards a click over the button.
