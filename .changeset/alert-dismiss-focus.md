---
"@ngrok/mantle": patch
---

`Alert.DismissIconButton` now moves keyboard focus to a neighbor when its dismissal unmounts the alert. Before, the unmount removed the focused button and focus fell to `<body>`. The next Tab restarted at the top of the page, and a screen reader user got no confirmation that the alert left. Now, when the alert unmounts while the dismiss button holds focus, focus moves to the nearest tabbable element outside the alert: the next one in document order, or the previous one when nothing follows. If your `onClick` handler or a layout effect places focus first, that choice stands. `AlertCenter.DismissIconButton` is unchanged: the center still lands focus on the next alert's control, or on the main landmark when no alert is left. The docs page shows the pattern under [Dismissal](https://mantle.ngrok.com/components/feedback/alert#dismissal).
