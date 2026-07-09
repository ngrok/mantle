import { CircleNotchIcon } from "@phosphor-icons/react/CircleNotch";
import { cva } from "class-variance-authority";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { Children, cloneElement, forwardRef, isValidElement } from "react";
import invariant from "tiny-invariant";
import { parseBooleanish } from "../../types/index.js";
import type { VariantProps } from "../../types/variant-props.js";
import { cx } from "../../utils/cx/cx.js";
import { Icon } from "../icon/index.js";
import { Slot } from "../slot/index.js";

const buttonVariants = cva("", {
	variants: {
		/**
		 * Defines the visual style of the Button.
		 */
		appearance: {
			filled:
				"bg-filled-accent text-white focus-visible:ring-focus-accent not-disabled:hover:bg-filled-accent-hover h-9 border border-transparent px-3 text-sm font-medium",
			ghost:
				"text-accent-600 focus-visible:ring-focus-accent not-disabled:hover:bg-accent-500/10 not-disabled:hover:text-accent-700 h-9 border border-transparent px-3 text-sm font-medium",
			outlined:
				"border-accent-600 bg-form text-accent-600 focus-visible:ring-focus-accent not-disabled:hover:border-accent-700 not-disabled:hover:bg-accent-500/10 not-disabled:hover:text-accent-700 h-9 border px-3 text-sm font-medium",
			link: "text-accent-600 focus-visible:ring-focus-accent not-disabled:hover:underline group/button-link border-transparent",
		},
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
		 * Indicates the importance or impact level of the button, affecting its
		 * color and styling to communicate its purpose to the user
		 */
		priority: {
			danger: "",
			default: "",
			neutral: "",
		},
	},
	defaultVariants: {
		appearance: "outlined",
		isLoading: false,
		priority: "default",
	},
	compoundVariants: [
		{
			appearance: "ghost",
			priority: "danger",
			class:
				"text-danger-600 focus-visible:ring-focus-danger not-disabled:hover:bg-danger-500/10 not-disabled:hover:text-danger-700 border-transparent",
		},
		{
			appearance: "outlined",
			priority: "danger",
			class:
				"border-danger-600 bg-form text-danger-600 focus-visible:ring-focus-danger not-disabled:hover:border-danger-700 not-disabled:hover:bg-danger-500/10 not-disabled:hover:text-danger-700",
		},
		{
			appearance: "filled",
			priority: "danger",
			class:
				"bg-filled-danger focus-visible:ring-focus-danger not-disabled:hover:bg-filled-danger-hover border-transparent",
		},
		{
			appearance: "link",
			priority: "danger",
			class: "text-danger-600 focus-visible:ring-focus-danger",
		},
		{
			appearance: "ghost",
			priority: "neutral",
			class:
				"text-strong focus-visible:ring-focus-accent not-disabled:hover:bg-neutral-500/10 not-disabled:hover:text-strong border-transparent",
		},
		{
			appearance: "outlined",
			priority: "neutral",
			class:
				"border-form bg-form text-strong focus-visible:border-accent-600 focus-visible:ring-focus-accent not-disabled:hover:border-neutral-400 not-disabled:hover:bg-form-hover not-disabled:hover:text-strong focus-visible:not-disabled:hover:border-accent-600",
		},
		{
			appearance: "filled",
			priority: "neutral",
			class:
				"bg-filled-neutral not-disabled:hover:bg-filled-neutral-hover border-transparent focus-visible:border-transparent text-neutral-50",
		},
		{
			appearance: "link",
			priority: "neutral",
			class: "text-strong focus-visible:ring-focus-accent",
		},
	],
});

type ButtonVariants = VariantProps<typeof buttonVariants>;

type ButtonAppearance = Pick<ButtonVariants, "appearance">["appearance"];
type ButtonPriority = Pick<ButtonVariants, "priority">["priority"];

/**
 * The props for the `Button` component.
 */
type ButtonProps = ComponentProps<"button"> &
	ButtonVariants & {
		/**
		 * An icon to render inside the button. If the `state` is `"pending"`, then
		 * the icon will automatically be replaced with a spinner.
		 */
		icon?: ReactNode;
		/**
		 * The side that the icon will render on, if one is present. If `state="pending"`,
		 * then the loading icon will also render on this side.
		 * @default "start"
		 */
		iconPlacement?: "start" | "end";
	} & (
		| {
				/**
				 * Use the `asChild` prop to compose Radix's functionality onto alternative
				 * element types or your own React components.
				 *
				 * When `asChild` is set to `true`, mantle will not render a default DOM
				 * element, instead cloning the component's child and passing it the props and
				 * behavior required to make it functional.
				 *
				 * asChild can be used as deeply as you need to. This means it is a great way
				 * to compose multiple primitive's behavior together.
				 *
				 * @see https://www.radix-ui.com/docs/primitives/guides/composition#composition
				 */
				asChild: true;
				/**
				 * The default behavior of the button. Possible values are: `"button"`, `"submit"`, and `"reset"`.
				 *
				 * if `asChild` is NOT used: Unlike the native `<button>` element, this prop is required and has no default value.
				 *
				 * If `asChild` IS used: This prop HAS NO EFFECT, is REMOVED, and has no default value. This is because we do not want the `button` `type` to automatically merge with any child anchor `type` attribute because the `anchor` `type` is _strictly different_ than the `button` type, see: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#type
				 *
				 * @enum
				 * - `"button"`: The button has no default behavior, and does nothing when pressed by default. It can have client-side scripts listen to the element's events, which are triggered when the events occur.
				 * - `"reset"`: The button resets all the controls to their initial values.
				 * - `"submit"`: The button submits the form data to the server.
				 *
				 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#type
				 */
				type?: ComponentProps<"button">["type"];
		  }
		| {
				asChild?: false | undefined;
				/**
				 * The default behavior of the button. Possible values are: `"button"`, `"submit"`, and `"reset"`.
				 *
				 * if `asChild` is NOT used: Unlike the native `<button>` element, this prop is required and has no default value.
				 *
				 * If `asChild` IS used: This prop HAS NO EFFECT, is REMOVED, and has no default value. This is because we do not want the `button` `type` to automatically merge with any child anchor `type` attribute because the `anchor` `type` is _strictly different_ than the `button` type, see: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#type
				 *
				 * @enum
				 * - `"button"`: The button has no default behavior, and does nothing when pressed by default. It can have client-side scripts listen to the element's events, which are triggered when the events occur.
				 * - `"reset"`: The button resets all the controls to their initial values.
				 * - `"submit"`: The button submits the form data to the server.
				 *
				 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#type
				 */
				type: Exclude<ComponentProps<"button">["type"], undefined>;
		  }
	);

/**
 * Renders a button or a component that looks like a button, an interactive
 * element activated by a user with a mouse, keyboard, finger, voice command, or
 * other assistive technology. Once activated, it then performs an action, such
 * as submitting a form or opening a dialog.
 *
 * @see https://mantle.ngrok.com/components/button
 *
 * @example
 * ```tsx
 * <Button type="button" appearance="filled" priority="default">
 *   Click me
 * </Button>
 * ```
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			"aria-disabled": _ariaDisabled,
			appearance = "outlined",
			asChild,
			children,
			className,
			disabled: _disabled,
			icon: propIcon,
			iconPlacement = "start",
			isLoading = false,
			priority = "default",
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
				buttonVariants({ appearance, priority, isLoading }),
				appearance !== "link" && "font-sans", // only enforce font-sans on non-link button appearances
				hasSpecialIconPadding && iconPlacement === "start" && "ps-2.5",
				hasSpecialIconPadding && iconPlacement === "end" && "pe-2.5",
				className,
			),
			"data-appearance": appearance,
			"data-disabled": disabled,
			"data-loading": isLoading,
			"data-priority": priority,
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
			<button {...buttonProps} type={type}>
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
	ButtonPriority,
	ButtonProps,
};
