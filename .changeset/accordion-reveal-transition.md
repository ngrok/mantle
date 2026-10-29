---
"@ngrok/mantle": patch
---

Keep the `Accordion.Content` transitions when ⌘F opens a closed section.

The find-in-page reveal turned the transition off until the section closed, and a closed section removed an inline `transition` from its `style` prop on mount. The reveal now turns the transition off only while it lays the content out, then restores the inline value.

See https://mantle.ngrok.com/components/data-display/accordion.
