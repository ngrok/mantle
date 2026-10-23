---
"@ngrok/mantle": patch
---

`AppLayout.Workspace` fills the frame at every width again. It no longer caps at `--app-layout-max-width` or centers with `mx-auto`, so on an ultrawide monitor the rail, the card, and the side panel span the whole window and leave no empty bands at the sides. The `--app-layout-max-width` variable is gone and has no effect.

See https://mantle.ngrok.com/layouts/app-layout#applayoutworkspace.
