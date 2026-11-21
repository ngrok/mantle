---
"@ngrok/mantle": patch
---

`dist/agent.json` now has a `sourceHash` of the package source and its dependency ranges. The mantle MCP server compares it with the hash of its docs build, and uses the docs as the contract of a version only when the two are equal. Before this change, the server used the docs on `main` as the contract of the latest release, so it showed props that the release did not have.
