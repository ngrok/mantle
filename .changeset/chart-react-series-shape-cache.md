---
"@ngrok/mantle": patch
---

The chart engine now reads each series' point glyph from the published series metadata instead of resolving the slot assignment again on every painted frame. Line markers, scatter points, and the 3D scatter allocate less per frame during tweens and rotation drags. The glyph a series wears does not change.
