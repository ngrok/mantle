---
"@ngrok/mantle": patch
---

Show the find-in-page highlight when ⌘F opens a closed `Accordion` section.

The browser opened the section, but the height transition started the content at zero height. The match was clipped when the browser painted its highlight, so no highlight showed. The reveal now turns the transition off for that paint, and closing the section restores it.

See https://mantle.ngrok.com/components/data-display/accordion.
