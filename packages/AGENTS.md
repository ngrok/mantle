# Packages

Read [CONVENTIONS.md](../CONVENTIONS.md) in full before you change code here.

- Imports are relative paths. Exports are named.
- `packages/mantle/src/components/` follows [COMPONENT_SPEC.md](../COMPONENT_SPEC.md).
- Nothing under `packages/mantle/src` imports a router or an app framework ([docs/framework-boundary.md](../docs/framework-boundary.md)).
- A change to a published package needs a changeset ([VERSIONING.md](../VERSIONING.md)).
- Tests follow [docs/testing.md](../docs/testing.md).
