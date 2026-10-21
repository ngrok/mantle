# Copilot PR Review Rules

- Always treat [CONVENTIONS.md](../CONVENTIONS.md) as the authoritative reference for code style, patterns, and conventions.
- See [AGENTS.md](../AGENTS.md) for which rules each task reads. Tests follow [docs/testing.md](../docs/testing.md), and components follow [COMPONENT_SPEC.md](../COMPONENT_SPEC.md).
- Do not comment on code patterns or placeholders documented in these files, such as the `//,` sentinel comment in [CONVENTIONS.md § Formatting & Linting](../CONVENTIONS.md#formatting--linting).
- Assume formatting/linting is already enforced by `pnpm run fmt` and `pnpm run lint`; do not duplicate those checks.
- Focus feedback on correctness, security, performance, and missing tests.
- Avoid suggesting changes to intentional patterns documented in CONVENTIONS.md.
- Prose in comments, JSDoc, changesets, and PR descriptions follows [CONVENTIONS.md § Writing](../CONVENTIONS.md#writing) (ASD-STE100 Simplified Technical English); do not suggest longer, more formal, or more hedged phrasing.
