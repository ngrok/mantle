/**
 * Re-exports for the Sandbar component.
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar
 */

import * as SandbarParts from "./sandbar-parts.js";

/**
 * A persistent, decision-bearing bar that floats near the bottom edge of the
 * viewport. It surfaces pending state (primarily a form's unsaved ("dirty")
 * changes) and stays until the user resolves it. Toast announces something
 * that already happened and leaves on its own; a Sandbar waits for the user's
 * decision. When the message needs no decision, reach for Toast or Alert.
 *
 * The name: a sandbar is a bar that blocks navigation, exactly what this
 * component does while changes are pending. Pair it with your app's
 * navigation guard and call `shake()` on the {@link SandbarHandle} when a
 * navigation attempt is blocked.
 *
 * @useWhen Hold the unsaved changes of a form in a bar at the bottom of the page until the user
 * saves or discards them.
 *
 * @siblings
 * - `Toast`: the message reports something that already happened and goes away on its own.
 * - `Alert`: the message needs no decision and stays in the page.
 * - `AlertDialog`: one destructive action needs a confirmation before it runs.
 *
 * @see https://mantle.ngrok.com/components/feedback/sandbar
 *
 * @example
 * Composition:
 * ```
 * Sandbar.Root
 * ├── Sandbar.Message
 * └── Sandbar.Actions
 *     ├── Sandbar.DiscardButton
 *     └── Sandbar.SaveButton
 * ```
 *
 * @example
 * ```tsx
 * <Sandbar.Root open={isDirty} handleRef={sandbarHandle}>
 *   <Sandbar.Message>You have unsaved changes</Sandbar.Message>
 *   <Sandbar.Actions>
 *     <Sandbar.DiscardButton onClick={reset}>Discard</Sandbar.DiscardButton>
 *     <Sandbar.SaveButton onClick={save} isLoading={isPending}>Save</Sandbar.SaveButton>
 *   </Sandbar.Actions>
 * </Sandbar.Root>
 * ```
 */
const Sandbar = SandbarParts;

export {
	//,
	Sandbar,
};
export type {
	//,
	SandbarActionsProps,
	SandbarDiscardButtonProps,
	SandbarHandle,
	SandbarMessageProps,
	SandbarRootProps,
	SandbarSaveButtonProps,
} from "./sandbar.js";
