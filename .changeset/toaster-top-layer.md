---
"@ngrok/mantle": patch
---

`Toaster` renders its toasts in a container on `<body>` after hydration, instead of in place. While a native dialog or sheet (`@ngrok/mantle/dialog/native`, `@ngrok/mantle/sheet/native`) is open, the container moves into it, so a toast fired from the dialog paints above it, takes clicks, and stays live for screen readers. The server no longer renders the empty toast region.
