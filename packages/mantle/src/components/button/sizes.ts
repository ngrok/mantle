/**
 * The single size scale shared by the button family (`Button`, `IconButton`,
 * and `SplitButton.Root`). Sizes with the same name always render the same
 * box height across components:
 *
 * - `xs` → 1.5rem (24px)
 * - `sm` → 1.75rem (28px)
 * - `md` → 2.25rem (36px, the default)
 * - `lg` → 2.5rem (40px)
 * - `xl` → 3rem (48px)
 *
 * See `decisions/2026-07-13-button-size-and-intent-api.md`.
 */
const buttonSizes = [
	//,
	"xs",
	"sm",
	"md",
	"lg",
	"xl",
] as const;

/**
 * The size of a button-family component (`Button`, `IconButton`, and
 * `SplitButton.Root`), controlling its box height and horizontal padding.
 * Defaults to `"md"` everywhere.
 *
 * @example
 * ```tsx
 * <Button appearance="outlined" intent="neutral" size="sm">Dense action</Button>
 * <IconButton appearance="outlined" intent="neutral" size="sm" label="Copy" icon={<CopyIcon />} />
 * ```
 */
type ButtonSize = (typeof buttonSizes)[number];

export type {
	//,
	ButtonSize,
};
