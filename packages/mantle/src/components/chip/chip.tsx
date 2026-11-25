"use client";

import { CheckIcon } from "@phosphor-icons/react/Check";
import { PlusIcon } from "@phosphor-icons/react/Plus";
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
import { parseBooleanish } from "../../types/booleanish.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { shakeElement } from "../../utils/shake.js";
import type { ButtonSize } from "../button/sizes.js";
import { Icon } from "../icon/icon.js";
import { Slot } from "../slot/index.js";

/** The Button size scale, from `xs` (24px) to `xl` (48px). */
type ChipSize = ButtonSize;

/** The chip's shape: a fully rounded `pill`, or a `square` with small corner radii. */
type ChipAppearance = "pill" | "square";

/**
 * The root classes for each appearance and size. A `square` chip at `sm` matches
 * the value tags in a `MultiSelect` trigger: it inherits the font, and a long label wraps.
 */
const chipClassName = {
	pill: {
		xs: "h-6 min-h-6 w-fit min-w-0 max-w-full gap-0.5 whitespace-nowrap rounded-full px-2 font-sans text-xs font-medium",
		sm: "h-7 min-h-7 w-fit min-w-0 max-w-full gap-0.5 whitespace-nowrap rounded-full px-2.5 font-sans text-sm font-medium",
		md: "h-9 min-h-9 w-fit min-w-0 max-w-full gap-1 whitespace-nowrap rounded-full px-3 font-sans text-sm font-medium",
		lg: "h-10 min-h-10 w-fit min-w-0 max-w-full gap-1 whitespace-nowrap rounded-full px-3.5 font-sans text-sm font-medium",
		xl: "h-12 min-h-12 w-fit min-w-0 max-w-full gap-1.5 whitespace-nowrap rounded-full px-4 font-sans text-base font-medium",
	},
	square: {
		xs: "gap-1 rounded-xs px-2 py-0.5 has-data-[slot=chip-remove]:pr-0.5 text-xs font-normal",
		sm: "gap-1 rounded-xs px-2 py-0.5 has-data-[slot=chip-remove]:pr-0.5 text-sm font-normal",
		md: "gap-1 rounded-sm px-2.5 py-1.5 has-data-[slot=chip-remove]:pe-1 text-sm font-normal",
		lg: "gap-1.5 rounded-sm px-3 py-2 has-data-[slot=chip-remove]:pe-1.5 text-sm font-normal",
		xl: "gap-1.5 rounded-md px-3.5 py-2.5 has-data-[slot=chip-remove]:pe-2 text-base font-normal",
	},
} as const satisfies Record<ChipAppearance, Record<ChipSize, string>>;

/**
 * Phosphor's `Lock` (regular) and `X` (bold) paths for the remove button.
 * Why inline paths: one host element in place of four parts for each chip.
 */
const LOCK_PATH =
	"M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z";
const X_PATH =
	"M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z";

/** The leading and state icon size for each chip size. */
const iconClassName = {
	xs: "size-3",
	sm: "size-3",
	md: "size-3.5",
	lg: "size-4",
	xl: "size-4",
} as const satisfies Record<ChipSize, string>;

/** The remove button and icon classes for each appearance and size. */
const removeClassName = {
	pill: {
		xs: { button: "-me-0.5 rounded-full", icon: "size-3" },
		sm: { button: "-me-0.5 rounded-full", icon: "size-3" },
		md: { button: "-me-1 rounded-full", icon: "size-3.5" },
		lg: { button: "-me-1 rounded-full", icon: "size-4" },
		xl: { button: "-me-1.5 rounded-full", icon: "size-4" },
	},
	square: {
		xs: { button: "rounded-xs", icon: "size-3" },
		sm: { button: "rounded-xs", icon: "size-4" },
		md: { button: "rounded-xs", icon: "size-4" },
		lg: { button: "rounded-sm", icon: "size-4" },
		xl: { button: "rounded-sm", icon: "size-5" },
	},
} as const satisfies Record<ChipAppearance, Record<ChipSize, { button: string; icon: string }>>;

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
		/**
		 * The chip's shape. `pill` is fully rounded and truncates a long label at its container's
		 * width. `square` has small corner radii, wraps a long label, and matches `MultiSelect`
		 * value tags at the `sm` size.
		 * @default "pill"
		 */
		appearance?: ChipAppearance;
		/**
		 * Height and spacing on the Button scale. A `pill` chip is as tall as a `Button` of the
		 * same size: 24px at `xs` to 48px at `xl`. A one-line `square` chip is 2px shorter.
		 * @default "xs"
		 */
		size?: ChipSize;
	};

type SelectableChipProps = Omit<ComponentProps<"button">, "type" | "aria-pressed"> &
	ChipSharedProps &
	ChipPressedState & {
		/** Renders a toggle button with `aria-pressed`. */
		selectable: true;
		/** Chip owns the pressed state; pass `pressed` or `defaultPressed` instead. */
		"aria-pressed"?: never;
		onRemove?: never;
		removeLabel?: never;
		locked?: never;
		/** An SVG icon in place of the plus or check icon. */
		icon?: ReactNode;
		removeButtonTabIndex?: never;
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
 * A plain chip renders a span. `onRemove` adds a remove button; `selectable` renders a toggle button.
 *
 * @see https://mantle.ngrok.com/components/forms/chip
 *
 * @example
 * ```tsx
 * <Chip>Read</Chip>
 * <Chip onRemove={removeWrite} removeLabel="Remove Write">Write</Chip>
 * <Chip selectable defaultPressed>Manage</Chip>
 * ```
 */
type ChipProps = PlainChipProps | RemovableChipProps | SelectableChipProps;

function SelectableChip({
	"data-slot": dataSlot,
	asChild = false,
	selectable: _selectable,
	pressed,
	defaultPressed = false,
	onPressedChange,
	appearance = "pill",
	size = "xs",
	className,
	children,
	icon: customIcon,
	disabled,
	onClick,
	ref,
	...props
}: SelectableChipProps) {
	const [uncontrolledPressed, setUncontrolledPressed] = useState(defaultPressed);
	const isPressed = pressed ?? uncontrolledPressed;
	const StateIcon = isPressed ? CheckIcon : PlusIcon;

	function handleClick(event: MouseEvent<HTMLButtonElement>) {
		if (disabled || parseBooleanish(props["aria-disabled"])) {
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
		"data-appearance": appearance,
		"data-size": size,
		// Why conditional: an undefined `disabled` would override a slotted button's own default.
		...(disabled != null && { disabled }),
		onClick: handleClick,
		ref,
		className: cx(
			"inline-flex cursor-pointer items-center border border-solid bg-transparent",
			"focus-visible:ring-focus-accent focus-visible:ring-4 focus-visible:outline-hidden",
			"disabled:cursor-default disabled:opacity-50 aria-disabled:cursor-default aria-disabled:opacity-50",
			"motion-safe:transition motion-safe:duration-200 motion-safe:ease-out-strong motion-safe:not-disabled:not-aria-disabled:active:scale-97",
			"not-aria-pressed:border-base not-aria-pressed:text-muted not-aria-pressed:not-disabled:not-aria-disabled:hover:text-body not-aria-pressed:not-disabled:not-aria-disabled:hover:bg-neutral-500/10",
			"aria-pressed:bg-accent-500/20 aria-pressed:text-accent-700 aria-pressed:not-disabled:not-aria-disabled:hover:bg-accent-500/30 aria-pressed:not-disabled:not-aria-disabled:hover:text-accent-800 aria-pressed:border-transparent",
			chipClassName[appearance][size],
			className,
		),
	};
	const icon = isValidElement(customIcon) ? (
		<Icon data-slot="chip-icon" svg={customIcon} className={iconClassName[size]} />
	) : (
		<StateIcon aria-hidden weight="bold" className={cx("shrink-0", iconClassName[size])} />
	);
	if (asChild) {
		invariant(
			isValidElement<{
				children?: ReactNode;
				type?: string;
				"aria-pressed"?: boolean;
				disabled?: boolean;
			}>(children) && Children.only(children),
			"When using `asChild`, a selectable Chip needs one button child.",
		);
		invariant(
			typeof children.type !== "string" || children.type === "button",
			"A selectable Chip can only wrap a button, since `aria-pressed` requires button semantics.",
		);
		return (
			<Slot {...buttonProps}>
				{/* Why these overrides: a child prop wins in Slot, but the chip owns the toggle semantics. */}
				{cloneElement(
					children,
					{ type: "button", "aria-pressed": isPressed, ...(disabled != null && { disabled }) },
					<>
						{icon}
						<span data-slot="chip-label" className="contents">
							<span className={cx(appearance === "pill" && "truncate px-0.5")}>
								{children.props.children}
							</span>
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
				<span className={cx(appearance === "pill" && "truncate px-0.5")}>{children}</span>
			</span>
		</button>
	);
}

function LabelChip({
	"data-slot": dataSlot,
	rootSlot = "chip",
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
	appearance = "pill",
	size = "xs",
	...props
}: (PlainChipProps | RemovableChipProps) & { rootSlot?: "chip" | "multi-select-tag" }) {
	const internalRef = useRef<HTMLSpanElement | null>(null);
	const composedRef = useComposedRefs(internalRef, ref);
	const hasRemoveButton = onRemove != null;
	// Why the button too: `aria-disabled` on the chip's span is not announced, so its remove button carries it.
	const isDisabled = parseBooleanish(props["aria-disabled"]);
	if (hasRemoveButton) {
		invariant(removeLabel != null, "A removable Chip needs `removeLabel` for its button.");
	}

	function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
		if ((locked || isDisabled) && (event.key === "Backspace" || event.key === "Delete")) {
			event.preventDefault();
			if (locked) {
				shakeElement(event.currentTarget);
			}
			return;
		}
		onKeyDown?.(event);
	}

	function handleRemoveClick(event: MouseEvent<HTMLButtonElement>) {
		event.stopPropagation();
		if (isDisabled) {
			return;
		}
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
		"data-slot": joinDataSlot(dataSlot, rootSlot),
		"data-appearance": appearance,
		"data-size": size,
		"data-locked": locked ? "" : undefined,
		onKeyDown: handleKeyDown,
		ref: composedRef,
		className: cx(
			"text-strong inline-flex items-center border border-neutral-500/20 bg-neutral-500/10",
			"motion-safe:data-shake:animate-shake aria-disabled:opacity-50",
			chipClassName[appearance][size],
			className,
		),
	};
	const removeButton = hasRemoveButton && (
		<button
			type="button"
			data-slot="chip-remove"
			aria-label={removeLabel}
			aria-disabled={locked || isDisabled || undefined}
			tabIndex={removeButtonTabIndex}
			className={cx(
				"text-strong/50 hover:bg-neutral-500/15 hover:text-strong cursor-pointer p-0.5",
				removeClassName[appearance][size].button,
				"focus-visible:ring-focus-accent focus-visible:ring-2 focus-visible:outline-hidden",
				"aria-disabled:cursor-default aria-disabled:hover:bg-transparent aria-disabled:hover:text-strong/50",
			)}
			onClick={handleRemoveClick}
			onMouseDown={handleRemoveMouseDown}
		>
			<svg
				aria-hidden
				data-slot="icon svg-only"
				viewBox="0 0 256 256"
				fill="currentColor"
				className={cx("shrink-0", removeClassName[appearance][size].icon)}
			>
				<path d={locked ? LOCK_PATH : X_PATH} />
			</svg>
		</button>
	);
	const contentFor = (label: ReactNode) => (
		<>
			{isValidElement(icon) && (
				<Icon data-slot="chip-icon" svg={icon} className={iconClassName[size]} />
			)}
			<span data-slot="chip-label" className="contents">
				<span className={cx(appearance === "pill" && "truncate px-0.5")}>{label}</span>
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
				!(["a", "button", "input", "label", "select", "textarea"] as const).includes(children.type),
			"A removable Chip cannot wrap an interactive element because it contains a remove button.",
		);
		return (
			<Slot {...spanProps}>{cloneElement(children, {}, contentFor(children.props.children))}</Slot>
		);
	}
	return <span {...spanProps}>{contentFor(children)}</span>;
}

/** Chip chrome for MultiSelect.Tag, which keeps its published root data-slot. */
function TagChip(props: RemovableChipProps) {
	return <LabelChip {...props} rootSlot="multi-select-tag" />;
}

/**
 * A compact label for a value or a selectable choice.
 * A plain chip renders a span. `onRemove` adds a button; `selectable` renders a toggle button.
 * If a selectable chip has an `icon`, it replaces the plus or check icon.
 * The `chip-label` slot has `display: contents` and keeps text safe when browser translation changes the page.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"chip"` | The root element. |
 * | `data-slot` | `"chip-label"` | The label wrapper, with `display: contents`. |
 * | `data-slot` | `"chip-icon"` | The optional leading icon. |
 * | `data-slot` | `"chip-remove"` | The optional remove button. |
 * | `data-state` | `"on"` \| `"off"` | The selectable state. |
 * | `data-appearance` | `"pill"` \| `"square"` | The shape of the chip. |
 * | `data-size` | `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | The size of the chip. |
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
 * @see https://mantle.ngrok.com/components/forms/chip
 *
 * @example
 * ```tsx
 * <Chip>Read</Chip>
 * <Chip onRemove={removeWrite} removeLabel="Remove Write">Write</Chip>
 * <Chip selectable defaultPressed>Manage</Chip>
 * ```
 */
function Chip(props: ChipProps) {
	if (props.selectable) {
		return <SelectableChip {...props} />;
	}
	return <LabelChip {...props} />;
}

export {
	//,
	Chip,
	TagChip,
};
export type {
	//,
	ChipProps,
};
