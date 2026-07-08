---
"@ngrok/mantle": patch
---

Update every JSDoc `@see` link to the reorganized docs URLs. Component docs now live at `mantle.ngrok.com/components/<category>/<name>` (e.g. `/components/actions/button`); the old flat URLs permanently redirect, so previously published links keep working. Also fixes a handful of `@see` links that pointed at pages that never existed (`/components/progress`, `/components/theme-provider`, `/components/button-group`, `/components/calendar`). No runtime changes.
