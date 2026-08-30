---
"@ngrok/mantle": patch
---

`Sandbar` now attaches a rejection handler to the shake animation's `finished` promise. Canceling a shake (a rapid second blocked attempt, or unmount mid-wiggle) rejects that promise with an `AbortError`, which surfaced as an unhandled rejection in test environments such as happy-dom 20.12.0.
