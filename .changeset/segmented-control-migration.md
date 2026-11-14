---
"@ngrok/mantle": minor
---

Add `SegmentedControl`, a row of segments that picks one value from a few short options, like a view or an environment switch. It replaces `RadioGroup.ButtonGroup` and `RadioGroup.Button`, which are gone.

- `SegmentedControl.Root` replaces `RadioGroup.ButtonGroup`, and `SegmentedControl.Item` replaces `RadioGroup.Button`. Import them from `@ngrok/mantle/segmented-control`. The props are the same: `value`, `defaultValue`, `onChange`, `name`, and `disabled`.
- It is a radio group underneath. `SegmentedControl` and `RadioGroup` share one primitive, so the roles, the arrow keys, `Field.Control`, and form submission with a `name` work the same, in a plain form or with TanStack Form.
- The control is a dim track, and a raised thumb slides to the checked item. The slide runs in every browser, and with reduced motion the thumb moves at once.
- A mouse or a finger can drag the thumb. It follows the pointer, stays inside the track, and on release slides to the nearest enabled item and checks it. A flick carries it further. A drag that goes up or down more than sideways does not start, so the page still scrolls. Mantle adds no dependency for the drag.
- While a drag runs, the root has `data-dragging`, and the item under the thumb has `data-thumb-over`.
- The `data-slot` values are `segmented-control` and `segmented-control-item`, in place of `radio-group-button-group` and `radio-group-button`.

To migrate, rename the parts and change the import. The codemod does both: `npx --yes --package=@ast-grep/cli@0.51.2 ast-grep scan --rule node_modules/@ngrok/mantle/dist/migrations/0015-segmented-control.yml --update-all <path>`. The guide is at https://mantle.ngrok.com/migrations/0015-segmented-control-migration, and the docs are at https://mantle.ngrok.com/components/forms/segmented-control.
