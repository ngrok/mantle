"use client";

import { CheckIcon } from "@phosphor-icons/react/Check";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import {
	Children,
	cloneElement,
	isValidElement,
	type ComponentProps,
	type MouseEvent,
	type ReactNode,
	useState,
} from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { ButtonSize } from "../button/sizes.js";
import { Slot } from "../slot/index.js";

/** A chip uses the `xs` and `sm` steps of the Button size scale. */
type ChipSize = Extract<ButtonSize, "xs" | "sm">;

const chipSizeClassName = {
	xs: "h-6 gap-1 ps-1.5 pe-2 text-xs",
	sm: "h-7 gap-1 ps-2 pe-2.5 text-sm",
} as const satisfies Record<ChipSize, string>;

/**
 * Controlled chips require `pressed` and `onPressedChange` together.
 * Otherwise the chip owns its state, starting at `defaultPressed`.
 */
type ChipPressedState =
	| {
			/** Whether the chip is on. Sets `aria-pressed`. */
			pressed: boolean;
			/** Receives the next pressed state. */
			onPressedChange: (pressed: boolean) => void;
			defaultPressed?: never;
	  }
	| {
			pressed?: never;
			/** Initial state when the chip owns its state. @default false */
			defaultPressed?: boolean;
			/** Receives the next pressed state. */
			onPressedChange?: (pressed: boolean) => void;
	  };

/**
 * Props for a compact button with a selected state.
 * Use `pressed` with `onPressedChange` to control the state, or `defaultPressed` to let the chip own it.
 *
 * @see https://mantle.ngrok.com/components/preview/chip
 *
 * @example
 * ```tsx
 * <Chip defaultPressed size="sm">Read</Chip>
 * ```
 */
type ChipProps = Omit<ComponentProps<"button">, "type" | "aria-pressed"> &
	WithAsChild &
	WithDataSlot &
	ChipPressedState & {
		/** Height and spacing on the Button scale. `xs` is 24px; `sm` is 28px. @default "xs" */
		size?: ChipSize;
	};

/**
 * A compact toggle button that turns an item in a set on or off.
 * The button sets `aria-pressed`. A plus or check icon shows the state without color.
 * The `chip-label` slot has `display: contents` and keeps the label safe when browser translation changes the page.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"chip"` | The root control. |
 * | `data-slot` | `"chip-label"` | The label wrapper around `children`, with `display: contents`. |
 * | `data-state` | `"on"` \| `"off"` | The pressed state. |
 * | `data-size` | `"xs"` \| `"sm"` | The size of the control. |
 *
 * @useWhen Turn one item in a set on or off, such as a filter or an access level.
 *
 * @siblings
 * - `Badge`: the label does not change state.
 * - `Checkbox`: the choice needs a form value.
 * - `MultiSelect`: the user must search a long list of choices.
 * - `Button`: a press runs an action without a selected state.
 *
 * @see https://mantle.ngrok.com/components/preview/chip
 *
 * @example
 * ```tsx
 * <Chip defaultPressed>Read</Chip>
 * <Chip pressed={isGranted} onPressedChange={setIsGranted}>Write</Chip>
 * ```
 */
function Chip({
	"data-slot": dataSlot,
	asChild = false,
	pressed,
	defaultPressed = false,
	onPressedChange,
	size = "xs",
	className,
	children,
	onClick,
	ref,
	...props
}: ChipProps) {
	const [uncontrolledPressed, setUncontrolledPressed] = useState(defaultPressed);
	const isPressed = pressed ?? uncontrolledPressed;
	const Icon = isPressed ? CheckIcon : PlusIcon;

	function handleClick(event: MouseEvent<HTMLButtonElement>) {
		onClick?.(event);
		if (event.defaultPrevented) {
			return;
		}

		if (pressed == null) {
			setUncontrolledPressed(!isPressed);
		}
		onPressedChange?.(!isPressed);
	}

	const buttonProps = {
		...props,
		"aria-pressed": isPressed,
		"data-slot": joinDataSlot(dataSlot, "chip"),
		"data-state": isPressed ? "on" : "off",
		"data-size": size,
		onClick: handleClick,
		ref,
		className: cx(
			"inline-flex w-fit shrink-0 cursor-pointer items-center rounded-full border border-solid font-sans font-medium whitespace-nowrap transition duration-150 ease-out",
			"focus-visible:ring-focus-accent focus-visible:ring-4 focus-visible:outline-hidden",
			"disabled:cursor-default disabled:opacity-50",
			"motion-safe:not-disabled:active:scale-97",
			"not-aria-pressed:border-base not-aria-pressed:text-muted not-aria-pressed:not-disabled:hover:text-body bg-transparent not-aria-pressed:not-disabled:hover:bg-neutral-500/10",
			"aria-pressed:bg-accent-500/20 aria-pressed:text-accent-700 aria-pressed:not-disabled:hover:bg-accent-500/30 aria-pressed:border-transparent",
			chipSizeClassName[size],
			className,
		),
	};
	const icon = <Icon aria-hidden weight="bold" className="size-3 shrink-0" />;
	if (asChild) {
		invariant(
			isValidElement<{ children?: ReactNode }>(children) && Children.only(children),
			"When using `asChild`, Chip must be passed a single child as a JSX tag.",
		);
		return (
			<Slot {...buttonProps}>
				{cloneElement(
					children,
					{},
					<>
						{icon}
						<span data-slot="chip-label" className="contents">
							{children.props.children}
						</span>
					</>,
				)}
			</Slot>
		);
	}
	return (
		<button {...buttonProps} type="button">
			{icon}
			<span data-slot="chip-label" className="contents">
				{children}
			</span>
		</button>
	);
}

export {
	//,
	Chip,
};
export type {
	//,
	ChipProps,
};
