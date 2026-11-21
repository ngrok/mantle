---
"@ngrok/mantle": patch
---

Each mantle icon now comes from the phosphor server build, `@phosphor-icons/react/dist/ssr/<Icon>`. That build renders the same SVG but does not read a phosphor `IconContext`, so a React Server Component can render it. Mantle icons now ignore an `IconContext` that an app sets. Their size and color come from mantle classes, as before.
