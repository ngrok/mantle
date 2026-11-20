# Build the behavior in

When a behavior has one right answer, mantle does it with no prop. A prop is for a product decision that differs between apps. The person who uses the app sets a preference by an action, and mantle keeps it as state.

**Why:** Mantle's value is the work that an app does not repeat. A behavior behind a prop is off in each app that does not know the prop, and each copy can drift. A prop is also API that mantle keeps: to add one later is a `patch`, and to remove one is a breaking `minor`.

**Applies to:** code. It applies to each behavior that keeps a layout, focus, an overflow, a landmark, or a first paint correct, and to each default.

**How to decide:** answer in order, and stop at the first answer.

1. **Does the wrong value break the layout, the keyboard contract, or what a screen reader reads?** Build it in. An app cannot opt out of Correct or Accessible.
2. **Does one answer fit each app?** Build it in. If you cannot name a shipped app that needs a second answer, and its reason, there is one answer.
3. **Is the difference a preference of the person who uses the app?** Keep it as state, not as a prop. Start from the system or the layout, and let an action override it. `ThemeSwitcher` starts on the system theme, and a click sets light or dark. `Sidebar.Root` yields its width to an open `AppLayout.SidePanel`, and `Sidebar.Trigger` overrides that.
4. **Is the difference a size, a color, or a breakpoint?** Use a CSS variable or a theme token, not a prop.
5. **Is the difference what the part renders?** Use children, `asChild`, or a part ([composition over configuration](./composition-over-configuration.md)).
6. **Is it a product decision that a named app makes differently?** Add the prop, and name the app in the pull request.

**Signs you missed it:**

- A boolean prop that turns on a behavior each app wants.
- A prop that an app must set for the layout to hold.
- A prop whose value repeats a token, a breakpoint, or state that mantle already has.
- A recipe that each app copies to get a behavior. That behavior is a part or a default.
- A prop with no named app behind it: "an app can want this".
- A prop for a choice that the person at the screen makes.

**In this repo:**

- [COMPONENT_SPEC.md §1.9](../../COMPONENT_SPEC.md#19-build-the-behavior-in-before-you-add-a-prop) owns the rule for a component.
- `Sidebar.Root` and `AppLayout.SidePanel` share the row width with no prop. Three apps had copied a recipe part for it, and the first design of the fix was two props that no app needed.
- `Button` sets `type="button"`, and `Field` passes each id through context. No app asks for either.

**Enforced by:** review, and the [review checklist](../../COMPONENT_SPEC.md#11-review-checklist).
