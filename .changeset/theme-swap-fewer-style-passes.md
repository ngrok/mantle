---
"@ngrok/mantle": patch
---

A theme swap restyles the document one time in place of three, so the reveal starts sooner and fast clicks on a `ThemeSwitcher` keep up on a large page.

Before, `setTheme` set an attribute on `<html>` that turned on a `transition: none` rule for every element, then changed the theme, then removed the attribute. Each step was a full style pass. The swap now cancels the transitions that the new theme starts, in script, and marks each open dialog or menu itself so that its exit animation stops. A page that holds more than about 2,000 elements with a transition keeps the rule, because the browser's list of running transitions costs more there.

On the Bar Chart docs page (12,645 elements), one swap fell from 262 ms to 161 ms of main-thread time, and its style time from 171 ms to 55 ms.
