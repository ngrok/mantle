---
"@ngrok/mantle": patch
---

`AppLayout.SidePanel` lets its close slide end before it turns its transitions off. Before, the panel turned them off about one frame early and the slide's last frame jumped. The panel now waits for its running transitions to finish, so a `duration-*` or `delay-*` that you set still sets the wait.
