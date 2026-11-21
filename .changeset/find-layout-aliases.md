---
"@ngrok/mantle": patch
---

Agents and people can now find Strata, Media Object, Choice, and App Layout by how designers describe them. `dist/agent.json` and the docs-site Model Context Protocol (MCP) `find` tool read these words:

- Strata has the aliases `form section`, `two-column form`, `two-column layout`, `description left controls right`, `label and description on the left`, and `group of info on the left form fields on the right`. Its `useWhen` now names long forms and the title and description on the left.
- Media Object has the aliases `icon on the left text on the right`, `image beside text`, and `avatar beside text`.
- Choice has the alias `checkbox on the left label on the right`, so a single control row still ranks Choice above Strata.
- The App Layout `useWhen` now says that the header holds the page heading and its actions.
