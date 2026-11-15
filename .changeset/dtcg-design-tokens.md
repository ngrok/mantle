---
"@ngrok/mantle": patch
---

Ship mantle's design tokens in the Design Tokens Community Group (DTCG) format, version 2025.10.

- `@ngrok/mantle/tokens.json` holds every token with its light theme value: the color palette and the semantic colors, font stacks, font weights, font sizes, spacing, radii, shadows, z-index, breakpoints, container widths, and timing functions.
- `@ngrok/mantle/tokens.dark.json` holds the tokens that change in the dark theme.
- `@ngrok/mantle/tokens.resolver.json` is a DTCG resolver document that applies the dark file for the `dark` context.

A token path joined with `-` names its Tailwind theme variable, so `color.sky.500` is `--color-sky-500`. The fluid font sizes `text-lg` to `text-9xl` use `clamp()`, which DTCG cannot express, so the files list them under `$extensions` with their CSS values.
