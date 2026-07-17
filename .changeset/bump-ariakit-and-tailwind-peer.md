---
"@ngrok/mantle": patch
---

Bump the `@ariakit/react` runtime dependency from 0.4.32 to 0.4.34 and move the `tailwindcss` peer range floor from `^4.3.2` to `^4.3.3`.

The ariakit bump (0.4.34 is a republish of 0.4.33, whose npm artifact shipped without build output) changes how `MultiSelect.Content` locks page scroll when opened outside a mantle modal: in browsers with `scrollbar-gutter` support, ariakit now reserves the gutter on the `html` element instead of hiding `body` overflow with padding compensation, and its `--scrollbar-width` CSS variable is only set in the legacy fallback path (Safari < 18.2) — styles reading it should keep a length fallback (`var(--scrollbar-width, 0px)`). Pages that already set `scrollbar-gutter` or `overflow-y: scroll` on `html` no longer shift when the popover opens. The bump also picks up a Korean IME fix for `autoSelect` comboboxes and faster component mounts. Mantle's in-modal scroll-lock opt-out (`preventBodyScroll` defaulting to `false` inside mantle modals) is unchanged and still required.

Tailwind 4.3.3 is a bug-fix-only patch (notably, achromatic `oklch` theme colors no longer shift hue under opacity modifiers); nothing in mantle requires it — the floor tracks the workspace toolchain. Consumers still on tailwindcss 4.3.2 will see an unmet-peer warning until they upgrade.
