---
"@ngrok/mantle": patch
---

The `scroll-fade-*` utilities set no mask on an element that cannot scroll. Before, each one painted an all-black mask that cost a mask layer on each paint. This applies to `Table`, `Tabs.List`, `Sidebar.Body`, `Breadcrumb.List`, `CodeBlock.TabList`, and `Conversation.Viewport`. In WebKit, a Markdown answer that streams tables into a chat had about 40% less frame overrun time. Chromium and Firefox showed no change. A container that scrolls fades as before.

An empty `Conversation.Viewport` now shows its focus ring when it has keyboard focus. Before, the mask clipped it.
