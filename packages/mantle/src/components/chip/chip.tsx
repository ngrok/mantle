"use client";

import { CheckIcon } from "@phosphor-icons/react/Check";
import { LockIcon } from "@phosphor-icons/react/Lock";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { XIcon } from "@phosphor-icons/react/X";
import {
	Children,
	cloneElement,
	isValidElement,
	type ComponentProps,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { shakeElement } from "../../utils/shake.js";
import type { ButtonSize } from "../button/sizes.js";
import { Icon } from "../icon/icon.js";
import { Slot } from "../slot/index.js";

/** The `xs` and `sm` steps of the Button size scale. */
type ChipSize = Extract<ButtonSize, "xs" | "sm">;

const chipSizeClassName = {
	xs: "h-6 gap-1 ps-1.5 pe-2 text-xs",
	sm: "h-7 gap-1 ps-2 pe-2.5 text-sm",
} as const satisfies Record<ChipSize, string>;

type ChipPressedState =
	| {
			/** The selected state. Sets `aria-pressed`. */
			pressed: boolean;
			/** Receives the next selected state. */
			onPressedChange: (pressed: boolean) => void;
			defaultPressed?: never;
	  }
	| {
			pressed?: never;
			/** Initial state when the chip owns its state. @default false */
			defaultPressed?: boolean;
			/** Receives the next selected state. */
			onPressedChange?: (pressed: boolean) => void;
	  };

type ChipSharedProps = WithAsChild &
	WithDataSlot & {
		/** Height and spacing on the Button scale. `xs` is 24px; `sm` is 28px. @default "xs" */
		size?: ChipSize;
	};

type SelectableChipProps = Omit<ComponentProps<"button">, "type" | "aria-pressed"> &
	ChipSharedProps &
	ChipPressedState & {
		/** Renders a toggle button with `aria-pressed`. */
		selectable: true;
		onRemove?: never;
		removeLabel?: never;
		locked?: never;
		/** An SVG icon before the state icon and label. */
		icon?: ReactNode;
		removeButtonTabIndex?: never;
	};

type SelectableRemovableChipProps = Omit<ComponentProps<"span">, "children" | "onClick"> &
	ChipSharedProps &
	ChipPressedState & {
		/** Renders a toggle button beside a remove button. */
		selectable: true;
		/** The chip's label. */
		children?: ReactNode;
		/** An SVG icon before the state icon and label. */
		icon?: ReactNode;
		/** Called after the remove button is activated. */
		onRemove: () => void;
		/** The remove button's accessible name. */
		removeLabel: string;
		/** Blocks removal while the chip remains selectable. @default false */
		locked?: boolean;
		/** Set to `-1` when a parent list owns keyboard focus. @default 0 */
		removeButtonTabIndex?: number;
		/** Called when the toggle button is activated. */
		onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
	};

type ChipLabelBaseProps = Omit<ComponentProps<"span">, "children"> &
	ChipSharedProps & {
		/** The chip's label. */
		children?: ReactNode;
		/** An SVG icon before the label. */
		icon?: ReactNode;
		selectable?: false;
		pressed?: never;
		defaultPressed?: never;
		onPressedChange?: never;
	};

type PlainChipProps = ChipLabelBaseProps & {
	onRemove?: never;
	removeLabel?: never;
	locked?: never;
	removeButtonTabIndex?: never;
};

type RemovableChipProps = ChipLabelBaseProps & {
	/** Called after the remove button is activated. */
	onRemove: () => void;
	/** The remove button's accessible name, such as `"Remove Write"`. */
	removeLabel: string;
	/** Keeps the remove button visible but blocks removal. @default false */
	locked?: boolean;
	/** Set to `-1` when a parent list owns keyboard focus. @default 0 */
	removeButtonTabIndex?: number;
};

/**
 * Props for a compact label, removable value, or selectable choice.
 * A plain chip renders a span. `selectable` adds a toggle button; `onRemove` adds a separate remove button.
 *
 * @see https://mantle.ngrok.com/components/preview/chip
 *
 * @example
 * ```tsx
 * <Chip>Read</Chip>
 * <Chip onRemove={removeWrite} removeLabel="Remove Write">Write</Chip>
 * <Chip selectable defaultPressed>Manage</Chip>
 * <Chip selectable onRemove={removeModel} removeLabel="Remove model">Model</Chip>
 * ```
 */
type ChipProps =
	| PlainChipProps
	| RemovableChipProps
	| SelectableChipProps
	| SelectableRemovableChipProps;

function SelectableChip({
	"data-slot": dataSlot,
	asChild = false,
	selectable: _selectable,
	pressed,
	defaultPressed = false,
	onPressedChange,
	size = "xs",
	className,
	children,
	icon: leadingIcon,
	disabled,
	onClick,
	ref,
	...props
}: SelectableChipProps) {
	const [uncontrolledPressed, setUncontrolledPressed] = useState(defaultPressed);
	const isPressed = pressed ?? uncontrolledPressed;
	const StateIcon = isPressed ? CheckIcon : PlusIcon;

	function handleClick(event: MouseEvent<HTMLButtonElement>) {
		if (disabled) {
			event.preventDefault();
			return;
		}
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
		disabled,
		onClick: handleClick,
		ref,
		className: cx(
			"inline-flex w-fit shrink-0 cursor-pointer items-center rounded-full border border-solid bg-transparent font-sans font-medium whitespace-nowrap",
			"focus-visible:ring-focus-accent focus-visible:ring-4 focus-visible:outline-hidden",
			"disabled:cursor-default disabled:opacity-50",
			"motion-safe:transition motion-safe:duration-150 motion-safe:ease-out motion-safe:not-disabled:active:scale-97",
			"not-aria-pressed:border-base not-aria-pressed:text-muted not-aria-pressed:not-disabled:hover:text-body not-aria-pressed:not-disabled:hover:bg-neutral-500/10",
			"aria-pressed:bg-accent-500/20 aria-pressed:text-accent-700 aria-pressed:not-disabled:hover:bg-accent-500/30 aria-pressed:border-transparent",
			chipSizeClassName[size],
			className,
		),
	};
	const icon = (
		<>
			{leadingIcon != null && <Icon data-slot="chip-icon" svg={leadingIcon} className="size-3" />}
			<StateIcon aria-hidden weight="bold" className="size-3 shrink-0" />
		</>
	);
	if (asChild) {
		invariant(
			isValidElement<{ children?: ReactNode }>(children) && Children.only(children),
			"When using `asChild`, a selectable Chip needs one button child.",
		);
		invariant(
			typeof children.type !== "string" || children.type === "button",
			"A selectable Chip can only wrap a button, since `aria-pressed` requires button semantics.",
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

function LabelChip({
	"data-slot": dataSlot,
	asChild = false,
	selectable: _selectable,
	className,
	children,
	icon,
	locked = false,
	onKeyDown,
	onRemove,
	removeButtonTabIndex = 0,
	removeLabel,
	ref,
	size = "xs",
	...props
}: PlainChipProps | RemovableChipProps) {
	const internalRef = useRef<HTMLSpanElement | null>(null);
	const composedRef = useComposedRefs(internalRef, ref);
	const hasRemoveButton = onRemove != null;
	if (hasRemoveButton) {
		invariant(removeLabel != null, "A removable Chip needs `removeLabel` for its button.");
	}

	function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
		if (locked && (event.key === "Backspace" || event.key === "Delete")) {
			event.preventDefault();
			shakeElement(event.currentTarget);
			return;
		}
		onKeyDown?.(event);
	}

	function handleRemoveClick(event: MouseEvent<HTMLButtonElement>) {
		event.stopPropagation();
		if (locked) {
			if (internalRef.current != null) {
				shakeElement(internalRef.current);
			}
			return;
		}
		onRemove?.();
	}

	function handleRemoveMouseDown(event: MouseEvent<HTMLButtonElement>) {
		if (removeButtonTabIndex < 0) {
			event.preventDefault();
		}
	}

	const spanProps = {
		...props,
		"data-slot": joinDataSlot(dataSlot, "chip"),
		"data-size": size,
		"data-locked": locked ? "" : undefined,
		onKeyDown: handleKeyDown,
		ref: composedRef,
		className: cx(
			"text-strong inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full border border-neutral-500/20 bg-neutral-500/10 font-sans font-medium",
			"motion-safe:data-shake:animate-shake",
			chipSizeClassName[size],
			hasRemoveButton && "pe-0.5",
			className,
		),
	};
	const removeButton = hasRemoveButton && (
		<button
			type="button"
			data-slot="chip-remove"
			aria-label={removeLabel}
			aria-disabled={locked || undefined}
			tabIndex={removeButtonTabIndex}
			className={cx(
				"text-strong/40 hover:bg-neutral-500/15 hover:text-strong cursor-pointer rounded-full p-0.5",
				"focus-visible:ring-focus-accent focus-visible:ring-2 focus-visible:outline-hidden",
				"aria-disabled:cursor-default aria-disabled:hover:bg-transparent aria-disabled:hover:text-strong/40",
			)}
			onClick={handleRemoveClick}
			onMouseDown={handleRemoveMouseDown}
		>
			<Icon svg={locked ? <LockIcon /> : <XIcon weight="bold" />} className="size-4" />
		</button>
	);
	const contentFor = (label: ReactNode) => (
		<>
			{icon != null && <Icon data-slot="chip-icon" svg={icon} className="size-3" />}
			<span data-slot="chip-label" className="contents">
				{label}
			</span>
			{removeButton}
		</>
	);

	if (asChild) {
		invariant(
			isValidElement<{ children?: ReactNode }>(children) && Children.only(children),
			"When using `asChild`, Chip needs one JSX child.",
		);
		invariant(
			!hasRemoveButton ||
				typeof children.type !== "string" ||
				!(["a", "button", "input", "select", "textarea"] as const).includes(children.type),
			"A removable Chip cannot wrap an interactive element because it contains a remove button.",
		);
		return (
			<Slot {...spanProps}>{cloneElement(children, {}, contentFor(children.props.children))}</Slot>
		);
	}
	return <span {...spanProps}>{contentFor(children)}</span>;
}

function SelectableRemovableChip({
	asChild = false,
	selectable: _selectable,
	pressed,
	defaultPressed = false,
	onPressedChange,
	onRemove,
	removeLabel,
	locked,
	icon,
	children,
	className,
	onClick,
	size = "xs",
	...props
}: SelectableRemovableChipProps) {
	const [uncontrolledPressed, setUncontrolledPressed] = useState(defaultPressed);
	const isPressed = pressed ?? uncontrolledPressed;
	const StateIcon = isPressed ? CheckIcon : PlusIcon;

	function handleToggleClick(event: MouseEvent<HTMLButtonElement>) {
		onClick?.(event);
		if (event.defaultPrevented) {
			return;
		}
		if (pressed == null) {
			setUncontrolledPressed(!isPressed);
		}
		onPressedChange?.(!isPressed);
	}

	const toggleButton = (
		<button
			type="button"
			data-slot="chip-toggle"
			aria-pressed={isPressed}
			className={cx(
				"inline-flex h-full cursor-pointer items-center gap-1 rounded-full bg-transparent ps-1.5 pe-2 text-inherit",
				"focus-visible:ring-focus-accent focus-visible:ring-2 focus-visible:outline-hidden",
				"motion-safe:active:scale-97",
				size === "sm" && "ps-2 pe-2.5",
			)}
			onClick={handleToggleClick}
		>
			{icon != null && <Icon data-slot="chip-icon" svg={icon} className="size-3" />}
			<StateIcon aria-hidden weight="bold" className="size-3 shrink-0" />
			{asChild && isValidElement<{ children?: ReactNode }>(children)
				? children.props.children
				: children}
		</button>
	);
	if (asChild) {
		invariant(
			isValidElement<{ children?: ReactNode }>(children) && Children.only(children),
			"When using `asChild`, a removable Chip needs one container child.",
		);
	}
	const content =
		asChild && isValidElement<{ children?: ReactNode }>(children)
			? cloneElement(children, {}, toggleButton)
			: toggleButton;

	return (
		<LabelChip
			{...props}
			asChild={asChild}
			size={size}
			onRemove={onRemove}
			removeLabel={removeLabel}
			locked={locked}
			data-state={isPressed ? "on" : "off"}
			className={cx(
				"border-base bg-transparent ps-0 text-muted motion-safe:transition motion-safe:duration-150 motion-safe:ease-out",
				"data-[state=on]:border-transparent data-[state=on]:bg-accent-500/20 data-[state=on]:text-accent-700",
				className,
			)}
		>
			{content}
		</LabelChip>
	);
}

/**
 * A compact label for a value or a selectable choice.
 * A plain chip renders a span. `selectable` adds a toggle button; `onRemove` adds a separate remove button.
 * The `chip-label` slot has `display: contents` and keeps text safe when browser translation changes the page.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"chip"` | The root element. |
 * | `data-slot` | `"chip-label"` | The label wrapper, with `display: contents`. |
 * | `data-slot` | `"chip-icon"` | The optional leading icon. |
 * | `data-slot` | `"chip-remove"` | The optional remove button. |
 * | `data-slot` | `"chip-toggle"` | The toggle button when a chip is also removable. |
 * | `data-state` | `"on"` \| `"off"` | The selectable state. |
 * | `data-size` | `"xs"` \| `"sm"` | The size of the chip. |
 * | `data-locked` | present when locked | Removal is blocked. |
 *
 * @useWhen Show a compact value, let a user remove it, or turn a choice on or off.
 *
 * @siblings
 * - `Badge`: the label shows status and has no control.
 * - `Checkbox`: the choice needs a form value.
 * - `MultiSelect`: the user must search a long list of choices.
 * - `Button`: a press runs an action without a selected state.
 *
 * @see https://mantle.ngrok.com/components/preview/chip
 *
 * @example
 * ```tsx
 * <Chip>Read</Chip>
 * <Chip onRemove={removeWrite} removeLabel="Remove Write">Write</Chip>
 * <Chip selectable defaultPressed>Manage</Chip>
 * <Chip selectable onRemove={removeModel} removeLabel="Remove model">Model</Chip>
 * ```
 */
function Chip(props: ChipProps) {
	if (props.selectable) {
		if (props.onRemove != null) {
			return <SelectableRemovableChip {...props} />;
		}
		return <SelectableChip {...props} />;
	}
	return <LabelChip {...props} />;
}

export {
	//,
	Chip,
};
export type {
	//,
	ChipProps,
};
