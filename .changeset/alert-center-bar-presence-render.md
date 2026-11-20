---
"@ngrok/mantle": patch
---

`AlertCenter.Bar` starts its exit in the render that removes the last alert. It no longer renders one more time from a layout effect. The bar looks and animates the same.
