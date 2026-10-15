---
"@ngrok/mantle": patch
---

`Tabs.Root` calls `onValueChange` once per activation. Radix activates a trigger on mousedown and moves focus to it in the same handler, and the focus activates it again before a controlled root re-renders, so a controlled `Tabs.Root` heard the same value twice in one dispatch. A tab strip that navigates in `onValueChange` then navigated twice, and a strip that writes a URL param wrote it twice.

The root now passes a repeated value through only when the dispatch has ended: a later press on the same trigger, which a consumer that kept the old value sees as a new request, still fires. Remove a guard you added for this in `onValueChange`; it is now redundant.
