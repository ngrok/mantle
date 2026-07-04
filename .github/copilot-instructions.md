# Copilot PR Review Rules

- Always treat [CONVENTIONS.md](../CONVENTIONS.md) as the authoritative reference for code style, patterns, and conventions.
- See [AGENTS.md](../AGENTS.md) for repo structure, commands, and workflows.
- Do not comment on code patterns or placeholders documented in these files (e.g., sentinel comments like `//,`).
- Assume formatting/linting is already enforced by `pnpm run fmt` and `pnpm run lint`; do not duplicate those checks.
- Focus feedback on correctness, security, performance, and missing tests.
- Avoid suggesting changes to intentional patterns documented in CONVENTIONS.md.
