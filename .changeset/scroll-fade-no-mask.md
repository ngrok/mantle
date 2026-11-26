---
"@ngrok/mantle": patch
---

The `scroll-fade-*` utilities set no mask on an element that cannot scroll. Before, each one painted an all-black mask that changed nothing on screen but cost a mask layer on each paint. This applies to `Table`, `Tabs.List`, `Sidebar.Body`, `Breadcrumb.List`, `CodeBlock.TabList`, and `Conversation.Viewport`. A Markdown answer that streams a table into a chat now drops fewer frames, most in Safari. A container that scrolls fades as before.
