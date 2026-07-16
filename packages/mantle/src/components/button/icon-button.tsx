import { CircleNotchIcon } from "@phosphor-icons/react/CircleNotch";
import { cva } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Children, cloneElement, forwardRef, isValidElement } from "react";
import invariant from "tiny-invariant";
import type { VariantProps, WithAsChild } from "../../types/index.js";
import { parseBooleanish } from "../../types/index.js";
import { cx } from "../../utils/cx/cx.js";
import { Icon } from "../icon/index.js";
import { Slot } from "../slot/index.js";
import type { ButtonIntent } from "./intents.js";
import type { ButtonSize } from "./sizes.js";

/**
 * The visual style of an `IconButton`: how much visual weight it carries,
 * independent of its tone (`intent`). IconButton has no `filled` or `link`
 * appearance — a filled icon-only box reads as a toggle, and an icon-only
 * link has no text to read as a link.
 */
type IconButtonAppearance = "ghost" | "outlined";

const baseIconButtonClasses = cx(
	"icon-button",
	"inline-flex shrink-0 items-center justify-center rounded-[var(--icon-button-border-radius,0.375rem)] border",
	"focus:outline-hidden focus-visible:ring-4",
	"disabled:cursor-default disabled:opacity-50",
	"not-disabled:active:scale-97 ease-out transition-transform duration-150",
);

const iconButtonVariants = cva(baseIconButtonClasses, {
	variants: {
		/**
		 * The visual style of the IconButton. The base classes carry the accent
		 * tone; danger and neutral tones override via compoundVariants.
		 */
		appearance: {
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
		 * Whether or not the button is in a loading state, default `false`. Setting `isLoading` will
		 * replace the `icon` with a spinner.
		 * It will also disable user interaction with the button and set `aria-disabled`.
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
	],
});

type IconButtonVariants = VariantProps<typeof iconButtonVariants>;

/**
 * The props for the `IconButton` component.
 */
type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
	WithAsChild &
	Omit<IconButtonVariants, "appearance" | "intent"> & {
		/**
		 * The visual style of the IconButton. Required — there is no default,
		 * so every call site states the weight it means.
		 *
		 * @enum
		 * - `"ghost"`: no border or fill until hovered
		 * - `"outlined"`: bordered on the form background
		 */
		appearance: IconButtonAppearance;
		/**
		 * The tone of the IconButton — the purpose its color communicates to
		 * the user. Required — there is no default, so every call site states
		 * the tone it means. `"neutral"` is the workhorse tone (and matches
		 * how IconButton rendered before it had an intent axis).
		 *
		 * @enum
		 * - `"neutral"`: the workhorse tone — routine and secondary actions
		 * - `"accent"`: deliberate brand emphasis; reach for it when an action should carry the brand color
		 * - `"danger"`: a destructive or irreversible action
		 */
		intent: ButtonIntent;
		/**
		 * The accessible label for the icon. This label will be visually hidden but announced to screen reader users, similar to alt text for img tags.
		 */
		label: string;
		/**
		 * An icon to render inside the button. If the `state` is `"pending"`, then
		 * the icon will automatically be replaced with a spinner.
		 */
		icon: ReactNode;
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
		type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
	};

/**
 * Renders a button or a component that looks like a button, an interactive
 * element activated by a user with a mouse, keyboard, finger, voice command, or
 * other assistive technology. Once activated, it then performs an action, such
 * as submitting a form or opening a dialog.
 * Renders only a single icon as children with an accessible, screen-reader-only label.
 *
 * `appearance` (visual weight) and `intent` (tone) are required — every call
 * site states what it means; there are no implicit defaults. `intent="neutral"`
 * matches how IconButton rendered before it had an intent axis.
 *
 * The border radius is driven by the `--icon-button-border-radius` CSS
 * variable (default: `0.375rem`). Wrappers can set it to slot icon buttons
 * into their chrome — e.g. `ButtonGroup`'s panel appearance tightens it to
 * `0.125rem`.
 *
 * @see https://mantle.ngrok.com/components/actions/icon-button
 *
 * @example
 * ```tsx
 * <IconButton
 *   icon={<TrashIcon />}
 *   label="Delete item"
 *   appearance="ghost"
 *   intent="danger"
 *   size="sm"
 *   onClick={handleDelete}
 * />
 * ```
 *
 * @example
 * Submit a form — opt in with `type="submit"` (the default `"button"` does not submit):
 * ```tsx
 * <IconButton
 *   type="submit"
 *   appearance="outlined"
 *   intent="neutral"
 *   icon={<MagnifyingGlassIcon />}
 *   label="Search"
 * />
 * ```
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
	(
		{
			"aria-disabled": _ariaDisabled,
			appearance,
			asChild = false,
			children,
			className,
			disabled: _disabled,
			icon: propIcon,
			intent,
			isLoading = false,
			label,
			size = "md",
			type,
			...props
		},
		ref,
	) => {
		const disabled = parseBooleanish(_ariaDisabled ?? _disabled ?? isLoading);
		const icon = isLoading ? <CircleNotchIcon className="animate-spin" /> : propIcon;

		const buttonProps = {
			"aria-disabled": disabled,
			"data-slot": "icon-button",
			className: cx(iconButtonVariants({ appearance, intent, isLoading, size }), className),
			"data-appearance": appearance,
			"data-disabled": disabled,
			"data-icon-button": true,
			"data-intent": intent,
			"data-loading": isLoading,
			"data-size": size,
			disabled,
			ref,
			...props,
		};

		const innerChildren = (
			<>
				<span className="sr-only">{label}</span>
				<Icon svg={icon} />
			</>
		);

		if (asChild) {
			invariant(
				isValidElement(children) && Children.only(children),
				"When using `asChild`, IconButton must be passed a single child as a JSX tag.",
			);

			return <Slot {...buttonProps}>{cloneElement(children, {}, innerChildren)}</Slot>;
		}

		return (
			// oxlint-disable-next-line react/button-has-type -- `type` defaults to "button" at runtime via the `?? "button"` fallback; the static analyzer can't resolve that expression.
			<button {...buttonProps} type={type ?? "button"}>
				{innerChildren}
			</button>
		);
	},
);
IconButton.displayName = "IconButton";

export {
	//,
	IconButton,
	iconButtonVariants,
};

export type {
	//,
	IconButtonAppearance,
	IconButtonProps,
};
