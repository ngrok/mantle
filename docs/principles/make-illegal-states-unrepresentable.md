# Make illegal states unrepresentable

Model a contract in the types so that the compiler rejects a wrong use. What the types cannot catch fails loudly at runtime.

**Why:** A type error shows at the call site, before the code ships. A runtime check shows only on the path that a test or a user happens to reach.

**Applies to:** code.

**Signs you missed it:**

- Two optional props that are valid only together, or never together.
- A string prop that accepts any value but handles three.
- A `value as Type` assertion that silences an error instead of fixing the model.

**In this repo:** [COMPONENT_SPEC.md §0.5 and §1.6](../../COMPONENT_SPEC.md#16-make-invalid-states-unrepresentable); [CONVENTIONS.md § TypeScript](../../CONVENTIONS.md#typescript).

**Enforced by:** `pnpm -w run typecheck`; review for unions that a type could express.
