import { CircleNotchIcon } from "@phosphor-icons/react/CircleNotch";
import { cva } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { Children, cloneElement, forwardRef, isValidElement } from "react";
import invariant from "tiny-invariant";
import { parseBooleanish } from "../../types/index.js";
import type { WithAsChild } from "../../types/index.js";
import type { VariantProps } from "../../types/variant-props.js";
import { clsx } from "../../utils/cx/clsx.js";
import { cx } from "../../utils/cx/cx.js";
import { Icon } from "../icon/index.js";
import { Slot } from "../slot/index.js";
import type { ButtonIntent } from "./intents.js";
import type { ButtonSize } from "./sizes.js";

/**
 * The visual style of a `Button`: how much visual weight the button carries,
 * independent of its tone (`intent`).
 *
 * - `"filled"` — solid fill; the heaviest weight on the page
 * - `"outlined"` — bordered on the form background
 * - `"ghost"` — no border or fill until hovered
 * - `"link"` — renders like an inline link (inherits surrounding typography)
 *   while remaining a button that performs an action
 */
type ButtonAppearance = "filled" | "ghost" | "link" | "outlined";

const buttonVariants = cva("", {
	variants: {
		/**
		 * The visual style of the Button. The base classes carry the accent
		 * tone; danger and neutral tones override via compoundVariants.
		 */
		appearance: {
			filled:
				"bg-filled-accent text-white focus-visible:ring-focus-accent not-disabled:hover:bg-filled-accent-hover border border-transparent text-sm font-medium",
			ghost:
				"text-accent-600 focus-visible:ring-focus-accent not-disabled:hover:bg-accent-500/10 not-disabled:hover:text-accent-700 border border-transparent text-sm font-medium",
			outlined:
				"border-accent-600 bg-form text-accent-600 focus-visible:ring-focus-accent not-disabled:hover:border-accent-700 not-disabled:hover:bg-accent-500/10 not-disabled:hover:text-accent-700 border text-sm font-medium",
			link: "text-accent-600 focus-visible:ring-focus-accent not-disabled:hover:underline group/button-link border-transparent",
		} satisfies Record<ButtonAppearance, string>,
		/**
		 * Whether or not the button is in a loading state, default `false`. Setting `isLoading` will
		 * replace any `icon` with a spinner, or add one if an icon wasn't given.
		 * It will also disable user interaction with the button and set `disabled`.
		 */
		isLoading: {
			false: "",
			true: "opacity-50",
		},
		/**
		 * The tone of the Button — the purpose its color communicates. The
		 * accent tone is styled by the appearance base classes; danger and
		 * neutral override via compoundVariants.
		 */
		intent: {
			accent: "",
			danger: "",
			neutral: "",
		} satisfies Record<ButtonIntent, string>,
		/**
		 * The size of the Button, controlling its box height and horizontal
		 * padding, default `"md"`. Shared scale with `IconButton` — same size
		 * name, same box height. Has no effect when `appearance` is `"link"`:
		 * link buttons inherit the surrounding typography and have no box to
		 * size.
		 */
		size: {
			xs: "",
			sm: "",
			md: "",
			lg: "",
			xl: "",
		} satisfies Record<ButtonSize, string>,
	},
	defaultVariants: {
		isLoading: false,
		size: "md",
	},
	compoundVariants: [
		// size controls box height + horizontal padding for every appearance except link
		{ appearance: ["filled", "ghost", "outlined"], size: "xs", class: "h-6 px-2" },
		{ appearance: ["filled", "ghost", "outlined"], size: "sm", class: "h-7 px-2.5" },
		{ appearance: ["filled", "ghost", "outlined"], size: "md", class: "h-9 px-3" },
		{ appearance: ["filled", "ghost", "outlined"], size: "lg", class: "h-10 px-3.5" },
		{ appearance: ["filled", "ghost", "outlined"], size: "xl", class: "h-12 px-4" },
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
			appearance: "link",
			intent: "danger",
			class: "text-danger-600 focus-visible:ring-focus-danger",
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
				"border-form bg-form text-strong focus-visible:border-accent-600 focus-visible:ring-focus-accent not-disabled:hover:border-neutral-400 not-disabled:hover:bg-form-hover not-disabled:hover:text-strong focus-visible:not-disabled:hover:border-accent-600",
		},
		{
			appearance: "filled",
			intent: "neutral",
			class:
				"bg-filled-neutral not-disabled:hover:bg-filled-neutral-hover border-transparent focus-visible:border-transparent text-neutral-50",
		},
		{
			appearance: "link",
			intent: "neutral",
			class: "text-strong focus-visible:ring-focus-accent",
		},
	],
});

/**
 * When an icon is present (and the appearance is not "link"), the icon-side
 * padding is the size's horizontal padding reduced by 0.125rem so the icon
 * reads as optically aligned with the text block.
 */
const iconPaddingStart = {
	xs: "ps-1.5",
	sm: "ps-2",
	md: "ps-2.5",
	lg: "ps-3",
	xl: "ps-3.5",
} as const satisfies Record<ButtonSize, string>;

const iconPaddingEnd = {
	xs: "pe-1.5",
	sm: "pe-2",
	md: "pe-2.5",
	lg: "pe-3",
	xl: "pe-3.5",
} as const satisfies Record<ButtonSize, string>;

type ButtonVariants = VariantProps<typeof buttonVariants>;

/**
 * The props for the `Button` component.
 */
type ButtonProps = ComponentProps<"button"> &
	Omit<ButtonVariants, "appearance" | "intent"> &
	WithAsChild & {
		/**
		 * The visual style of the Button. Required — there is no default, so
		 * every call site states the weight it means.
		 *
		 * @enum
		 * - `"filled"`: solid fill; the heaviest visual weight
		 * - `"outlined"`: bordered on the form background
		 * - `"ghost"`: no border or fill until hovered
		 * - `"link"`: renders like an inline link (inherits surrounding typography) while remaining a button
		 */
		appearance: ButtonAppearance;
		/**
		 * The tone of the Button — the purpose its color communicates to the
		 * user. Required — there is no default, so every call site states the
		 * tone it means.
		 *
		 * @enum
		 * - `"accent"`: the primary/brand action on a surface
		 * - `"danger"`: a destructive or irreversible action
		 * - `"neutral"`: everything else; the workhorse tone for secondary and routine actions
		 */
		intent: ButtonIntent;
		/**
		 * An icon to render inside the button, beside the button's text
		 * children. If the `state` is `"pending"`, then the icon will
		 * automatically be replaced with a spinner.
		 *
		 * For an icon-only button, do not use `Button` — use `IconButton`
		 * instead: it requires an accessible `label` and renders a square box
		 * on the same shared size scale.
		 */
		icon?: ReactNode;
		/**
		 * The side that the icon will render on, if one is present. If `state="pending"`,
		 * then the loading icon will also render on this side.
		 * @default "start"
		 */
		iconPlacement?: "start" | "end";
		/**
		 * The behavior of the button when activated. Defaults to `"button"`, so the
		 * button does not accidentally submit a surrounding `<form>` — pass
		 * `type="submit"` to submit a form, or `type="reset"` to reset it.
		 *
		 * When `asChild` is used, `type` has no effect and is not forwarded to the
		 * child, so a wrapped anchor never inherits a `button` `type`. See:
		 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#type
		 *
		 * @default "button"
		 * @enum
		 * - `"button"`: The button has no default behavior, and does nothing when pressed by default. It can have client-side scripts listen to the element's events, which are triggered when the events occur.
		 * - `"reset"`: The button resets all the controls to their initial values.
		 * - `"submit"`: The button submits the form data to the server.
		 *
		 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#type
		 */
		type?: ComponentProps<"button">["type"];
	};

/**
 * Renders a button or a component that looks like a button, an interactive
 * element activated by a user with a mouse, keyboard, finger, voice command, or
 * other assistive technology. Once activated, it then performs an action, such
 * as submitting a form or opening a dialog.
 *
 * `appearance` (visual weight) and `intent` (tone) are required — every call
 * site states what it means; there are no implicit defaults.
 *
 * An icon-only button is not a `Button` — use `IconButton` instead: an
 * icon-only `Button` has no accessible name and keeps its text-box padding,
 * while `IconButton` requires a screen-reader `label` and renders a square
 * box on the same shared size scale.
 *
 * @see https://mantle.ngrok.com/components/actions/button
 *
 * @example
 * ```tsx
 * <Button appearance="filled" intent="accent" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 *
 * @example
 * Submit a form — opt in with `type="submit"` (the default `"button"` does not submit):
 * ```tsx
 * <Button type="submit" appearance="filled" intent="accent">
 *   Save
 * </Button>
 * ```
 *
 * @example
 * Icon-only buttons are not `Button`s — use `IconButton` instead (an icon-only
 * `Button` has no accessible name and keeps its text-box padding):
 * ```tsx
 * // ❌ <Button appearance="outlined" intent="neutral" icon={<CopyIcon />} onClick={copyPage} />
 * <IconButton appearance="outlined" intent="neutral" icon={<CopyIcon />} label="Copy page" onClick={copyPage} />
 * ```
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			"aria-disabled": _ariaDisabled,
			appearance,
			asChild,
			children,
			className,
			disabled: _disabled,
			icon: propIcon,
			iconPlacement = "start",
			intent,
			isLoading = false,
			size = "md",
			type,
			...props
		},
		ref,
	) => {
		const disabled = parseBooleanish(_ariaDisabled ?? _disabled ?? isLoading);
		const icon = isLoading ? <CircleNotchIcon className="animate-spin" /> : propIcon;

		/**
		 * If the button has an icon and is not a link, add padding-start or padding-end to the button depending on the icon placement.
		 */
		const hasSpecialIconPadding = icon && appearance !== "link";

		const buttonProps = {
			"aria-disabled": disabled,
			"data-slot": "button",
			className: cx(
				"inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md",
				"focus:outline-hidden focus-visible:ring-4",
				"disabled:cursor-default disabled:opacity-50",
				"not-disabled:active:scale-97 ease-out transition-transform duration-150",
				buttonVariants({ appearance, intent, isLoading, size }),
				appearance !== "link" && "font-sans", // only enforce font-sans on non-link button appearances
				hasSpecialIconPadding && iconPlacement === "start" && iconPaddingStart[size],
				hasSpecialIconPadding && iconPlacement === "end" && iconPaddingEnd[size],
				className,
			),
			"data-appearance": appearance,
			"data-disabled": disabled,
			"data-intent": intent,
			"data-loading": isLoading,
			"data-size": appearance === "link" ? undefined : size,
			disabled,
			ref,
			...props,
		};

		if (asChild) {
			invariant(
				isValidElement<{ children?: ReactNode }>(children) && Children.only(children),
				"When using `asChild`, Button must be passed a single child as a JSX tag.",
			);

			return (
				<Slot {...buttonProps}>
					{cloneElement(
						children,
						{},
						<>
							{icon && (
								<Icon svg={icon} className={clsx(iconPlacement === "end" && "order-last")} />
							)}
							{children.props.children}
						</>,
					)}
				</Slot>
			);
		}

		return (
			// oxlint-disable-next-line react/button-has-type -- `type` defaults to "button" at runtime via the `?? "button"` fallback; the static analyzer can't resolve that expression.
			<button {...buttonProps} type={type ?? "button"}>
				{icon && <Icon svg={icon} className={clsx(iconPlacement === "end" && "order-last")} />}
				{children}
			</button>
		);
	},
);
Button.displayName = "Button";

export {
	//,
	Button,
};

export type {
	//,
	ButtonAppearance,
	ButtonProps,
};
