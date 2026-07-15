/**
 * The tone axis shared by the button family (`Button` and `IconButton`) —
 * the purpose a button's color communicates to the user:
 *
 * - `"neutral"` — the workhorse tone: routine and secondary actions, and the
 *   default primary action (`appearance="filled" intent="neutral"`)
 * - `"accent"` — deliberate brand emphasis, colored with the accent tokens
 *   (e.g. `bg-filled-accent`, `text-accent-600`); reach for it when an
 *   action should carry the brand color, not as the routine primary
 * - `"danger"` — a destructive or irreversible action
 *
 * There is no default: `intent` is a required prop on the button family so
 * every call site states the tone it means.
 *
 * See `decisions/2026-07-13-button-size-and-intent-api.md`.
 *
 * @example
 * ```tsx
 * <Button appearance="filled" intent="neutral">Save</Button>
 * <Button appearance="outlined" intent="neutral">Cancel</Button>
 * <Button appearance="filled" intent="danger">Delete</Button>
 * <Button appearance="filled" intent="accent">Upgrade to Pro</Button>
 * ```
 */
type ButtonIntent = "accent" | "danger" | "neutral";

export type {
	//,
	ButtonIntent,
};
