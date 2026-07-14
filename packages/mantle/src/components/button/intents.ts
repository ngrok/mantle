/**
 * The tone axis shared by the button family (`Button` and `IconButton`) —
 * the purpose a button's color communicates to the user:
 *
 * - `"accent"` — the primary/brand action on a surface, colored with the
 *   accent tokens (e.g. `bg-filled-accent`, `text-accent-600`)
 * - `"danger"` — a destructive or irreversible action
 * - `"neutral"` — everything else; the workhorse tone for secondary and
 *   routine actions
 *
 * There is no default: `intent` is a required prop on the button family so
 * every call site states the tone it means.
 *
 * See `decisions/2026-07-13-button-size-and-intent-api.md`.
 *
 * @example
 * ```tsx
 * <Button appearance="filled" intent="accent">Save</Button>
 * <Button appearance="outlined" intent="neutral">Cancel</Button>
 * <Button appearance="filled" intent="danger">Delete</Button>
 * ```
 */
type ButtonIntent = "accent" | "danger" | "neutral";

export type {
	//,
	ButtonIntent,
};
