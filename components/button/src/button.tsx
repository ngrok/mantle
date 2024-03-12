import { CircleNotch } from "@phosphor-icons/react/CircleNotch";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import clsx from "clsx";
import {
	Children,
	cloneElement,
	forwardRef,
	HTMLAttributes,
	isValidElement,
	MouseEvent,
	PropsWithChildren,
	ReactNode,
	type ButtonHTMLAttributes,
} from "react";
import { cx } from "../../core";
import type { WithAsChild } from "../../types/src/as-child";
import type { VariantProps } from "../../types/src/variant-props";

const buttonVariants = cva(
	"items-center justify-center gap-1.5 whitespace-nowrap rounded-md focus-within:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50 aria-disabled:opacity-50 sm:text-sm [&>*]:focus-within:outline-none",
	{
		variants: {
			/**
			 * Defines the visual style of the Button.
			 */
			appearance: {
				filled:
					"inline-flex h-11 border border-transparent bg-filled-accent px-3 font-medium text-on-filled hover:bg-filled-accent-hover focus-visible:border-accent-600 focus-visible:ring-focus-accent active:bg-filled-accent-active sm:h-9",
				ghost:
					"inline-flex h-11 border border-transparent px-3 font-medium text-accent-600 hover:bg-accent-500/10 hover:text-accent-700 focus-visible:ring-focus-accent active:bg-accent-500/15 active:text-accent-700 sm:h-9",
				outlined:
					"inline-flex h-11 border border-accent-600 bg-form px-3 font-medium text-accent-600 hover:border-accent-700 hover:bg-accent-50 hover:text-accent-700 focus-visible:ring-focus-accent active:border-accent-700 active:bg-accent-100 active:text-accent-700 sm:h-9",
				link: "group inline cursor-pointer border-transparent text-accent-600 hover:underline focus-visible:ring-focus-accent",
			},
			/**
			 * The side that the icon will render on, if one is present. If `state="pending"`,
			 * then the loading icon will also render on this side.
			 */
			iconPlacement: {
				end: "pe-2.5",
				start: "ps-2.5",
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
			/**
			 * The state of the button, default `"idle"`. If the button should present
			 * a "loading state", use `"pending"`. Setting the state to `"pending"` will
			 * replace any `icon` with a spinner, or add one if an icon wasn't given.
			 * It will also disable user interaction with the button and set `aria-disabled`.
			 */
			state: {
				idle: "",
				pending: "opacity-50",
			},
		},
		defaultVariants: {
			appearance: "outlined",
			priority: "default",
			state: "idle",
		},
		compoundVariants: [
			{
				appearance: "ghost",
				priority: "danger",
				class:
					"border-transparent text-danger-600 hover:bg-danger-500/10 hover:text-danger-700 focus-visible:ring-focus-danger active:bg-danger-500/15 active:text-danger-700",
			},
			{
				appearance: "outlined",
				priority: "danger",
				class:
					"border-danger-600 bg-form text-danger-600 hover:border-danger-700 hover:bg-danger-50 hover:text-danger-700 focus-visible:ring-focus-danger active:border-danger-700 active:bg-danger-100 active:text-danger-700",
			},
			{
				appearance: "filled",
				priority: "danger",
				class:
					"border-transparent bg-filled-danger hover:bg-filled-danger-hover focus-visible:border-danger-600 focus-visible:ring-focus-danger active:bg-filled-danger-active",
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
					"border-transparent text-strong hover:bg-neutral-500/10 hover:text-strong focus-visible:ring-focus-accent active:bg-neutral-500/15 active:text-strong",
			},
			{
				appearance: "outlined",
				priority: "neutral",
				class:
					"border-form bg-form text-strong hover:border-neutral-400 hover:bg-form-hover hover:text-strong focus-visible:border-accent-600 focus-visible:ring-focus-accent active:border-neutral-400 active:bg-form-active active:text-strong focus-visible:active:border-accent-600",
			},
			{
				appearance: "filled",
				priority: "neutral",
				class:
					"border-transparent bg-filled-neutral hover:bg-filled-neutral-hover focus-visible:border-neutral-600 focus-visible:ring-focus-neutral active:bg-filled-neutral-active",
			},
			{
				appearance: "link",
				priority: "neutral",
				class: "text-strong focus-visible:ring-focus-accent",
			},
		],
	},
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

/**
 * The props for the `Button` component.
 */
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
	WithAsChild &
	ButtonVariants & {
		/**
		 * An icon to render inside the button. If the `state` is `"pending"`, then
		 * the icon will automatically be replaced with a spinner.
		 */
		icon?: ReactNode;
	};

/**
 * Renders a button or a component that looks like a button, an interactive
 * element activated by a user with a mouse, keyboard, finger, voice command, or
 * other assistive technology. Once activated, it then performs an action, such
 * as submitting a form or opening a dialog.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			appearance = "outlined",
			asChild = false,
			children,
			className: propClassName,
			icon: propIcon,
			iconPlacement = "start",
			priority = "default",
			state = "idle",
			"aria-disabled": _ariaDisabled,
			...props
		},
		ref,
	) => {
		const ariaDisabled = _ariaDisabled ?? state === "pending";
		const icon = state === "pending" ? <CircleNotch className="animate-spin" /> : propIcon;
		const className = cx(
			buttonVariants({ appearance, priority, state, iconPlacement: icon ? iconPlacement : undefined }),
			propClassName,
		);
		const onClickCapture = (event: MouseEvent<HTMLButtonElement>) => {
			if (state === "pending") {
				event.preventDefault();
				event.stopPropagation();
			}
			props.onClickCapture?.(event);
		};

		if (asChild) {
			const singleChild = Children.only(children) as ReactNode;
			const isValidChild = isValidElement(singleChild);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const grandchildren = (isValidChild ? singleChild.props?.children : null) as ReactNode;

			return (
				<Slot
					aria-disabled={ariaDisabled}
					className={className}
					data-state={state}
					onClickCapture={onClickCapture}
					ref={ref}
					{...props}
				>
					{isValidChild &&
						cloneElement(
							singleChild,
							{},
							<InnerContent appearance={appearance} icon={icon} iconPlacement={iconPlacement}>
								{grandchildren}
							</InnerContent>,
						)}
				</Slot>
			);
		}

		return (
			<button
				aria-disabled={ariaDisabled}
				className={className}
				data-state={state}
				onClickCapture={onClickCapture}
				ref={ref}
				{...props}
			>
				<InnerContent appearance={appearance} icon={icon} iconPlacement={iconPlacement}>
					{children}
				</InnerContent>
			</button>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };

const ButtonIcon = ({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
	<span className={cx("[&>svg]:size-5", className)} {...props}>
		{children}
	</span>
);

type InnerContentProps = PropsWithChildren & Pick<ButtonProps, "appearance" | "icon" | "iconPlacement">;

const InnerContent = ({ appearance, children, icon, iconPlacement }: InnerContentProps) => (
	<span
		className={clsx(
			"inline-flex items-center gap-1.5 focus-within:outline-none focus-visible:outline-none",
			appearance === "link" && "group-hover:underline",
		)}
	>
		{icon && <ButtonIcon className={clsx(iconPlacement === "end" && "order-last")}>{icon}</ButtonIcon>}
		{children}
	</span>
);
