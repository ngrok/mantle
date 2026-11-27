---
"@ngrok/mantle": patch
---

Keep a `HoverCard` open while a pointer rests on the link or the card, or the link has focus, and close it `closeDelay` after neither holds it (WCAG 1.4.13). Before, a pointer that left a focused link closed the card, and a focus move closed it at once. The keyboard no longer enters the card: its links and buttons leave the Tab order.
