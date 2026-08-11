---
"@ngrok/mantle": minor
---

Stack floating UI in two tiers so a background popover can never paint over an open dialog.

Overlays — `Dialog`, `AlertDialog`, `Sheet`, and `Command.DialogRoot` — now render at `z-60`, above the float tier. Floats — `Popover`, `Tooltip`, `Select`, `DropdownMenu`, and `HoverCard` — stay at `z-50` and portal into the nearest overlay's positioner instead of `document.body`. A float composed inside an overlay now always paints above the overlay that owns it. A float outside every overlay always paints below the overlay tier. Before this change every layer shared `z-50` and the most recently mounted one won, so a popover that opened late — an onboarding popover after hydration, for example — painted on top of an open full-bleed dialog.

The positioner is a new styling hook on each overlay: `data-slot="dialog-positioner"`, `data-slot="alert-dialog-positioner"`, and `data-slot="sheet-positioner"`.

An explicit `container` on `Dialog.Portal` or `HoverCard.Portal` now also carries into the parts that portal internally, so the content lands in that container — before, the inner portal ignored it.

Migration, for the rare consumer this breaks:

- Custom fixed chrome at `z-50` that must paint above an open mantle overlay needs `z-60` or higher.
- CSS that selects a float's portal as a direct `body` child (for example `body > [data-radix-popper-content-wrapper]`) no longer matches when the float is composed inside an overlay. Select the float's `data-slot` instead.

`Combobox.Content` (renders in place), `MultiSelect.Content` (portals into the overlay's `data-mantle-modal-content`), and `Toast` (sonner's own viewport, far above both tiers) keep their placement.
