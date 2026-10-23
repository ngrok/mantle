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

## Exceptions

- **A full-page reveal** (the `ThemeSwitcher` circle) runs 400ms on CSS `ease-out`. The covered area grows with
  the square of the radius, so `ease-out-strong` in 300ms changes most of the screen in about 40ms, like a flash.
  The control's own state still changes on the input.
- **An error shake** (`animate-shake`) is a keyframe animation, not a transition: it starts and ends at rest, so
  it has no end value to retarget to. It moves 4px and settles in 300ms. The first swing eases out, and the other
  swings ease in and out, like a damped spring. A form control runs it once when it enters the error state. The
  animation starts when the `data-validation-error:` rule starts to match, so it does not run again while the
  error stays, on focus, or on blur. The shake is never the only error signal: the border, `aria-invalid`, and
  the error message stay. A blocked action calls `shakeElement` (`utils/shake.ts`) on an element that
  composes `motion-safe:data-shake:animate-shake`; no component keeps its own shake keyframes.
- **A Radix overlay** keeps keyframes (`animate-in`, `animate-out`): Radix unmounts on `animationend` and ignores
  transitions, and a transition needs `forceMount`, which keeps each closed overlay in the DOM. A positioner
  around the content holds `animate-exit-hold` so Radix waits for the exit.
- **An edge panel** (`Sheet`, `Sandbar`) slides its full size from the screen edge.

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
- `ThemeSwitcher` and every `setTheme` call (`theme/swap-theme.ts`): a view transition that animates `clip-path` on `::view-transition-new(root)` with the Web
  Animations API. While a view transition runs, the browser sends each click to `<html>`, so the switcher
  ends the transition on a click and sends the click to the element under the pointer.
