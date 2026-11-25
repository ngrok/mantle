---
"@ngrok/mantle": patch
---

Open `DropdownMenu` from a click with no press, as a screen reader or `element.click()` sends.

`DropdownMenu.Trigger` opened only on a pointer press or a key. A screen reader that activates the button with a click got no menu. Now that click toggles the menu and moves focus to its first item. A pointer click and Enter or Space work as before.

In tests, `fireEvent.click(trigger)` and `trigger.click()` now open the menu and focus its first item. A test that clicked the trigger only to check that its row does not react now also gets the menu, and a first item that is a link with `prefetch="intent"` can start its prefetch. Mock that request, or assert on what the row does.

Docs: https://mantle.ngrok.com/components/overlays/dropdown-menu
