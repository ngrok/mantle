---
"@ngrok/mantle": patch
---

`Slider` no longer uses a third-party primitive. Each thumb is a native `<input type="range">`, and Mantle drops `@radix-ui/react-slider`. The props, the `data-slot` values, and `onValueChange` stay the same.

Bundle size (gzip, React external): `Slider` 19.2 KB → 12.7 KB. 8.3 KB of that is the `cx` runtime that every mantle component shares.

- The server HTML holds each thumb at its value, and screen readers find each thumb before hydration. The placeholder thumb is gone.
- An uncontrolled slider keeps its values in the DOM. A drag or a key press changes the thumb's CSS and calls `onValueChange`, and React renders nothing.
- `id` goes onto the first thumb, so a `<label htmlFor>` names and focuses it. `aria-describedby`, `aria-errormessage`, and `aria-invalid` go onto each thumb only.
- A form reset returns an uncontrolled slider to `defaultValue`. A controlled slider keeps its `value`, as a controlled React input does.
- A disabled slider now tells assistive technology that each thumb is disabled, and submits no value with its form, as a disabled native input does.
- A press on a thumb grabs it where it is, so the thumb no longer jumps to the pointer on the first move.
- `Home` and `End` move the focused thumb as far as `min`, `max`, or its neighbor allows. Before, they always moved the first or the last thumb.
- With no `dir` prop, the slider follows the text direction it inherits from the page. Before, it was left to right.
- Each thumb has `data-slot="slider-input"` on its range input. `data-orientation` and `data-disabled` are on the root only. The track, the range, and the thumbs no longer carry them.
- A right-click no longer moves a thumb.
- Its type no longer offers `asChild`, which never worked: the slider slotted its track and thumbs into one child.

See https://mantle.ngrok.com/components/forms/slider.
