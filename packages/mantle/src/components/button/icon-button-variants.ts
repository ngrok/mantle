import { clsx } from "../../utils/cx/clsx.js";
import { cx } from "../../utils/cx/cx.js";
import type { ButtonSize } from "./sizes.js";

/**
 * The visual style of an `IconButton`: how much visual weight it carries.
 * The union matches `Button`'s without `link`: an icon-only link has no text
 * to read as a link.
 *
 * - `"filled"`: solid fill; the heaviest weight on the page
 * - `"ghost"`: no border or fill until hovered
 * - `"outlined"`: bordered on the form background
 */
type IconButtonAppearance = "filled" | "ghost" | "outlined";

/**
 * The tone of an `IconButton` (the purpose its color communicates to the
 * user). Narrower than `ButtonIntent`: an icon carries no text to name the
 * action a tone colors, so `IconButton` draws the neutral tone only.
 *
 * - `"neutral"`: the workhorse tone; the only tone `IconButton` draws
 */
type IconButtonIntent = "neutral";

/**
 * The size of an `IconButton`: the shared `ButtonSize` scale plus `2xs`, a
 * 1.25rem (20px) box that shrinks the icon to 1rem (16px). Only `IconButton`
 * has `2xs`, because a `Button` that small has no room for its label.
 */
type IconButtonSize = "2xs" | ButtonSize;

const baseIconButtonClasses = cx(
	"icon-button",
	"inline-flex shrink-0 items-center justify-center rounded-(--icon-button-border-radius,0.375rem) border",
	"focus-visible:focus-ring",
	"disabled:cursor-default disabled:opacity-50",
	"aria-disabled:cursor-default aria-disabled:opacity-50",
	"not-disabled:active:scale-97 ease-out transition-transform duration-150",
);

/**
 * The classes of each appearance. Each carries the neutral tone outright,
 * because that is the only tone `IconButton` draws.
 */
const appearanceClasses = {
	filled:
		"bg-filled-neutral text-neutral-50 focus-visible:border-transparent not-disabled:hover:bg-filled-neutral-hover border-transparent",
	ghost:
		"text-strong not-disabled:hover:bg-neutral-500/10 not-disabled:hover:text-strong border-transparent",
	outlined:
		"border-form bg-form text-strong focus-visible:border-accent-600 not-disabled:hover:border-neutral-400 not-disabled:hover:bg-form-hover not-disabled:hover:text-strong focus-visible:not-disabled:hover:border-accent-600 focus-visible:not-disabled:active:border-accent-600",
} as const satisfies Record<IconButtonAppearance, string>;

/** The box of each size. `2xs` also shrinks the icon. */
const sizeClasses = {
	"2xs": "size-5 [&_svg]:size-4",
	xs: "size-6",
	sm: "size-7",
	md: "size-9",
	lg: "size-10",
	xl: "size-12",
} as const satisfies Record<IconButtonSize, string>;

/** The variant props that pick an `IconButton`'s classes. */
type IconButtonVariants = {
	/**
	 * The visual style of the IconButton. Each appearance carries the neutral
	 * tone outright, because that is the only tone `IconButton` draws.
	 */
	appearance?: IconButtonAppearance;
	/**
	 * The tone of the IconButton. One value, and it styles nothing: the
	 * appearance classes already draw it. It stays so a call site
	 * that names its tone, like `Calendar`'s nav buttons, keeps compiling.
	 */
	intent?: IconButtonIntent;
	/**
	 * Whether the button is in a loading state. `isLoading` replaces
	 * the `icon` with a spinner.
	 * It also disables user interaction with the button and sets `aria-disabled`.
	 * @default false
	 */
	isLoading?: boolean;
	/**
	 * The size of the IconButton. Shared scale with
	 * `Button` (same size name, same box height), plus `2xs`, which also
	 * shrinks the icon.
	 * @default "md"
	 */
	size?: IconButtonSize;
};

/**
 * Composes the className for an `IconButton` from its variant props. Lives in
 * its own module (rather than `icon-button.tsx`) so that components which only
 * need the classes (e.g. `Calendar`'s nav buttons) can import them without
 * pulling the `IconButton` implementation into their module graph.
 *
 * @example
 * ```tsx
 * const navButtonClasses = iconButtonVariants({ appearance: "ghost", intent: "neutral", size: "sm" });
 * ```
 */
const iconButtonVariants = ({ appearance, isLoading, size = "md" }: IconButtonVariants): string =>
	clsx(
		baseIconButtonClasses,
		appearance && appearanceClasses[appearance],
		isLoading && "opacity-50",
		sizeClasses[size],
	);

export {
	//,
	iconButtonVariants,
};

export type {
	//,
	IconButtonAppearance,
	IconButtonIntent,
	IconButtonVariants,
};
