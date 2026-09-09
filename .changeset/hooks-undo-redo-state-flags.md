---
"@ngrok/mantle": patch
---

`useUndoRedo` now derives `canUndo` and `canRedo` from state instead of reading its history refs during render. The history itself still lives in refs, so two `undo` or `redo` calls inside one event handler still return successive snapshots. The returned object and the re-render timing are unchanged; the hook now follows the Rules of React.
