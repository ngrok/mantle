---
"@ngrok/mantle": patch
---

`Command.Input` uses a 16px font on a touch screen, like `Input` and `TextArea`. iOS Safari zooms the page when it focuses a field with a font smaller than 16px, so the 14px field zoomed in and made the page overflow when you tapped it. The field stays 14px with a mouse.
