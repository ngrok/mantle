import { cva } from "class-variance-authority";
import type { VariantProps } from "../../types/index.js";
import { cx } from "../../utils/cx/cx.js";
import type { ButtonIntent } from "./intents.js";
import type { ButtonSize } from "./sizes.js";

/**
 * The visual style of an `IconButton`: how much visual weight it carries,
 * independent of its tone (`intent`). The union matches `Button`'s without
 * `link` — an icon-only link has no text to read as a link.
 *
 * - `"filled"` — solid fill; the heaviest weight on the page
 * - `"ghost"` — no border or fill until hovered
 * - `"outlined"` — bordered on the form background
 */
type IconButtonAppearance = "filled" | "ghost" | "outlined";

const baseIconButtonClasses = cx(
	"icon-button",
	"inline-flex shrink-0 items-center justify-center rounded-[var(--icon-button-border-radius,0.375rem)] border",
	"focus:outline-hidden focus-visible:ring-4",
	"disabled:cursor-default disabled:opacity-50",
	"not-disabled:active:scale-97 ease-out transition-transform duration-150",
);

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
const iconButtonVariants = cva(baseIconButtonClasses, {
	variants: {
		/**
		 * The visual style of the IconButton. The base classes carry the accent
		 * tone; danger and neutral tones override via compoundVariants.
		 */
		appearance: {
			filled:
				"bg-filled-accent text-white focus-visible:ring-focus-accent not-disabled:hover:bg-filled-accent-hover border-transparent",
			ghost:
				"text-accent-600 focus-visible:ring-focus-accent not-disabled:hover:bg-accent-500/10 not-disabled:hover:text-accent-700 border-transparent",
			outlined:
				"border-accent-600 bg-form text-accent-600 focus-visible:ring-focus-accent not-disabled:hover:border-accent-700 not-disabled:hover:bg-accent-500/10 not-disabled:hover:text-accent-700",
		} satisfies Record<IconButtonAppearance, string>,
		/**
		 * The tone of the IconButton — the purpose its color communicates. The
		 * accent tone is styled by the appearance base classes; danger and
		 * neutral override via compoundVariants.
		 */
		intent: {
			accent: "",
			danger: "",
			neutral: "",
		} satisfies Record<ButtonIntent, string>,
		/**
		 * Whether the button is in a loading state, default `false`. `isLoading` replaces
		 * the `icon` with a spinner.
		 * It also disables user interaction with the button and sets `aria-disabled`.
		 */
		isLoading: {
			false: "",
			true: "opacity-50",
		},
		/**
		 * The size of the IconButton, default `"md"`. Shared scale with
		 * `Button` — same size name, same box height.
		 */
		size: {
			xs: "size-6",
			sm: "size-7",
			md: "size-9",
			lg: "size-10",
			xl: "size-12",
		} satisfies Record<ButtonSize, string>,
	},
	defaultVariants: {
		// Runtime fallback only: `intent` is required in IconButtonProps, but
		// untyped call sites that still omit it (the compiler cannot flag them)
		// must keep the pre-intent neutral rendering, not silently flip to the
		// accent tone the appearance base classes carry.
		intent: "neutral",
		size: "md",
	},
	compoundVariants: [
		{
			appearance: "ghost",
			intent: "danger",
			class:
				"text-danger-600 focus-visible:ring-focus-danger not-disabled:hover:bg-danger-500/10 not-disabled:hover:text-danger-700 border-transparent",
		},
		{
			appearance: "outlined",
			intent: "danger",
			class:
				"border-danger-600 bg-form text-danger-600 focus-visible:ring-focus-danger not-disabled:hover:border-danger-700 not-disabled:hover:bg-danger-500/10 not-disabled:hover:text-danger-700",
		},
		{
			appearance: "filled",
			intent: "danger",
			class:
				"bg-filled-danger focus-visible:ring-focus-danger not-disabled:hover:bg-filled-danger-hover border-transparent",
		},
		{
			appearance: "ghost",
			intent: "neutral",
			class:
				"text-strong focus-visible:ring-focus-accent not-disabled:hover:bg-neutral-500/10 not-disabled:hover:text-strong border-transparent",
		},
		{
			appearance: "outlined",
			intent: "neutral",
			class:
				"border-form bg-form text-strong focus-visible:border-accent-600 focus-visible:ring-focus-accent not-disabled:hover:border-neutral-400 not-disabled:hover:bg-form-hover not-disabled:hover:text-strong focus-visible:not-disabled:hover:border-accent-600 focus-visible:not-disabled:active:border-accent-600",
		},
		{
			appearance: "filled",
			intent: "neutral",
			class:
				"bg-filled-neutral not-disabled:hover:bg-filled-neutral-hover border-transparent focus-visible:border-transparent text-neutral-50",
		},
	],
});

type IconButtonVariants = VariantProps<typeof iconButtonVariants>;

export {
	//,
	iconButtonVariants,
};

export type {
	//,
	IconButtonAppearance,
	IconButtonVariants,
};
