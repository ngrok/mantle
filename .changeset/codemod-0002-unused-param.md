---
"@ngrok/mantle": patch
---

The 0002 codemod now drops the `props` parameter from an action column's `header` arrow when it only passed `props.column`. Before, the rewrite left `header: (props) =>` with `props` unused, so an app with `noUnusedParameters` failed typecheck.
