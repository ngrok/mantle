---
"@ngrok/mantle": patch
---

A test can click a `RadioGroup` or `SegmentedControl` radio by its role, as in 0.94.1. Playwright `getByRole("radio").click()` and `check()`, and Testing Library `user.click()`, work without `force`. The radio is a small invisible box at the middle of the item's start edge, so a click at its center lands on the radio itself.
