---
"@ngrok/mantle": patch
---

Add a `@useWhen` tag to the JSDoc of every component and layout, and a `@siblings` tag where a component has a close alternative. `dist/agent.json` carries the tags as `useWhen` and `siblings`, so an agent can pick a component from an intent such as "confirm before delete". The `AlertDialog` record also lists the aliases `confirm` and `confirmation`.
