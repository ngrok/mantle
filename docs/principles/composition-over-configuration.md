# Composition over configuration

Build small parts that compose, and build them first. A prop sets the common case. `asChild`, children, and parts do the rest. Never add a prop bag.

**Why:** A part does one job, so an app can use it again in a place that mantle did not plan for. A prop that configures an internal element hides that element, and the list of such props grows with each new request. A closed component makes each new use case a change to mantle. A set of parts makes it a change at the call site.

**Applies to:** code. It applies to a component, a hook, a recipe, and a utility. Make the small pieces first, then make the larger piece from them.

**Signs you missed it:**

- A prop that forwards props to an internal element: `contentProps`, `triggerProps`, or `slotProps`.
- A part that renders rows, an empty state, or a footer from a data prop.
- A boolean prop that shows or hides an internal element. That element is a part.
- A new component that copies the markup of a component that exists, when it can render that component.
- A hook or a function that does two jobs, so no caller can use one job alone.
- A prop for a job that `asChild` or `children` already does.

**In this repo:**

- [COMPONENT_SPEC.md §0](../../COMPONENT_SPEC.md#0-principles) item 4, [§1.5](../../COMPONENT_SPEC.md#15-composition-vs-data-driven), and [§1.7](../../COMPONENT_SPEC.md#17-forbidden-api-shapes) own the rules. A data prop is correct only when behavior must reach items that are not mounted.
- `SplitButton` is `Button`, `IconButton`, and `DropdownMenu` with no new behavior.
- `Query.Content` first rendered its list, empty state, and footer from `items` (#1622). #1633 made each one a part.

**Enforced by:** `/audit-component` for the composition check of §1.5. Review for the rest.
