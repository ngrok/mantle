---
"@ngrok/mantle": patch
---

`usePrefersReducedMotion` now returns the real preference in the first render of a client mount. Before this change every mount rendered `true` (reduce motion), committed, and then re-rendered with the real value from an effect. A dialog or carousel that mounted after hydration and picked its duration from the hook started with no animation, then flipped to the animated variant after paint. Its entrance animation skipped or restarted. The server render and the hydration render still return `true`, so nothing animates before hydration.
