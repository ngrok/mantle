---
"@ngrok/mantle": patch
---

`QrCode.Frame` is now an image to assistive technology. It always carries `role="img"` and takes `aria-label` or `aria-labelledby` for its name; when neither is set, the name falls back to "QR code". Pass a label that says what the code encodes, such as "QR code for ngrok.com". Before this change, a screen reader met an unnamed graphic. `role` is no longer a `Frame` prop.
