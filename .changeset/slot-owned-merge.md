---
"@ngrok/mantle": patch
---

`Slot` no longer uses `@radix-ui/react-slot`. Mantle now owns the prop merge: the child's event handler runs before the `Slot`'s, refs from both sides receive the element (a ref callback cleanup runs on unmount), and `aria-describedby` ids from both sides are joined without duplicates. `Slot` stays a server component.

A part that is not set leaves the child's own prop alone, so `Slot` sends no `undefined` props to the child. Unlike the Radix slot, `Slot` does not unwrap a lazy child from a React Server Components payload. Pass it an element.

A page that renders `Button` with no Radix part ships about 0.9 KB (gzip) less JavaScript. A page that also renders a Radix part, such as `Tooltip`, ships about 0.2 KB more until that part moves off Radix, because Radix keeps its own slot.
