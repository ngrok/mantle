---
"@ngrok/mantle": patch
---

Decouple cross-component helper imports so importing one component no longer pulls another component's implementation into the bundle:

- `preventCloseOnPromptInteraction` moved out of `toast.tsx` into its own module. The Dialog/Sheet primitive imported it from the Toast implementation, which dragged sonner (and its import-time CSS injection) into every dialog-only consumer bundle — a dialog-only Vite 8 build shrinks from 117.0 KB to 86.0 KB (−26.5%).
- `iconButtonVariants` moved out of `icon-button.tsx` into its own module, so `Calendar` (which only needs the classes for its nav buttons) no longer imports the `IconButton` implementation.

No public API changes — both helpers were internal.
