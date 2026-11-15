---
"@ngrok/mantle": patch
"@ngrok/mantle-vite-plugins": patch
"@ngrok/mantle-server-syntax-highlighter": patch
---

`dist/agent.json` and `dist/llms.txt` now name the hosted MCP server, `https://mantle.ngrok.com/mcp`, in `endpoints.mcp`. `dist/llms.txt` now tells agents to read the type declarations that `package.json#exports` names, because some subpaths do not ship a `.d.ts` file with the same name.

`agent.json` now reads a JSDoc that has a `//` comment between it and its declaration, so `useCallbackRef` has its summary and example.

The npm pages of all three packages now link to the package directory in the repository, and list keywords for search.
