---
"@ngrok/mantle": patch
---

`Slider` shows each thumb at its value in the server HTML. Radix hides a thumb until hydration, so a server-rendered slider showed a track with no thumb until its JavaScript ran. `Slider` now renders an `aria-hidden` placeholder for each thumb, in the same place and with the same look. The placeholder hides when Radix shows the thumb, so the first paint and the hydrated slider match.
