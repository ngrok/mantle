---
"@ngrok/mantle": patch
---

A `Dialog`, `AlertDialog`, `Sheet`, or `Command` palette that opens from a trigger inside an open native modal (`@ngrok/mantle/dialog/native`, `@ngrok/mantle/sheet/native`, or the mobile `Sidebar.Nav`) now mounts in that modal, even when its content renders outside it. Before this change, the dialog mounted in `<body>`, behind the modal, where the browser made it inert: it did not show and it took no input. It stays in the modal until its exit ends. If the modal closes first, the dialog moves to the next open modal or to `<body>`, so it stays visible and takes input.
