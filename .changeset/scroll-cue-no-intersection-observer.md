---
"@ngrok/mantle": patch
---

`Select`, `Combobox`, `MultiSelect`, `DropdownMenu`, and `Command` work again where `IntersectionObserver` is missing, such as jsdom. Their lists threw on open there. The list now shows no edge cue in that case.
