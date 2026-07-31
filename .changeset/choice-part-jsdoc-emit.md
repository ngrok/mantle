---
"@ngrok/mantle": patch
---

Fix `Choice` publishing none of its per-part documentation, so hovering `Choice.Root` in an editor showed
nothing.

Each `Choice` part carries a summary, a `@see` link to its docs anchor, and an `@example` in the source, and
none of it reached the published types. The namespace object was declared with an explicit type annotation —
`const Choice: { Root: typeof Root; … } = { … } as const` — and the build emits the annotation in place of
the documented object literal. `dist` shipped a bare member list. `Choice` was the only namespace in the
package written that way, so every other compound component already documented its parts here.

The annotation is gone. `as const` alone emits the same named member types and keeps the documentation, and
it restores the `readonly` modifiers the annotation was discarding: `readonly Root: typeof Root` instead of
`Root: typeof Root`. The parts, their props, and their runtime behavior are unchanged.

`COMPONENT_SPEC.md` asks for the annotation when a member's type comes from a third-party namespace, and it
now records this cost, because the published types are the only channel that feeds editor tooltips.
