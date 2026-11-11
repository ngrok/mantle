---
"@ngrok/mantle": patch
---

`Alert.DismissIconButton` stays at the trailing edge when the alert also has an `Alert.ExpandButton`. The expand button now moves to the left of the dismiss button. `AlertCenter.Bar` gets the same order. Put `Alert.ExpandButton` before `Alert.DismissIconButton` in your markup so the Tab order matches the visual order.
