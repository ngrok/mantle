---
"@ngrok/mantle": patch
---

Remove the unused `color` mode from `InlineIconProps`. No icon implemented the `"auto"` branded fill it described, and every consumer omitted the prop; the ngrok marks fill with `currentColor`, so the `color` CSS property sets the fill. `Omit<InlineIconProps, "color">` still compiles.
