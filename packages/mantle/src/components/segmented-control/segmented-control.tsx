"use client";

import { createContext, useContext, useId, useRef } from "react";
import type { RefObject } from "react";
import invariant from "tiny-invariant";
import { $cssProperties } from "../../types/index.js";
import { useComposedRefs } from "../../utils/compose-refs/index.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { ButtonSize } from "../button/sizes.js";
import * as RadioPrimitive from "../radio-group/primitive.js";
import { useSegmentedThumb } from "./use-segmented-thumb.js";

/**
 * The size of a `SegmentedControl`: the button family's scale. A size renders
 * the same box height as a `Button` or `IconButton` of the same name.
 */
type SegmentedControlSize = ButtonSize;

/** The size of the `SegmentedControl.Root` around a part, or `null` outside one. */
const SizeContext = createContext<SegmentedControlSize | null>(null);

const rootSizeClasses = {
	xs: "h-6",
	sm: "h-7",
	md: "h-9",
	lg: "h-10",
	xl: "h-12",
} as const satisfies Record<SegmentedControlSize, string>;

// Why: the same horizontal padding as a `Button` of the same size. Why a short line at xs and sm:
// the thumb is 8px shorter than the track, so a label line keeps 2px above and below it.
// Why a 1.5rem basis at xs and sm: one-character and icon targets stay 24px apart (WCAG 2.5.8),
// and `min-width: auto` still keeps a long label at its full width.
const itemSizeClasses = {
	xs: "flex-[1_0_1.5rem] px-2 text-xs/3",
	sm: "flex-[1_0_1.5rem] px-2.5 text-sm/4",
	md: "px-3 text-sm",
	lg: "px-3.5 text-sm",
	xl: "px-4 text-sm",
} as const satisfies Record<SegmentedControlSize, string>;

/**
 * The props of `SegmentedControl.Root`: the same props as `RadioGroup.Root`,
 * including `value`, `defaultValue`, `onValueChange`, `name`, `form`, and
 * `disabled`, plus `size`.
 */
type SegmentedControlRootProps = RadioPrimitive.RootProps & {
	/**
	 * The size of the control, default `"md"`. It sets the track height and
	 * the padding of each item, on the button family's scale: `xs` 24px, `sm`
	 * 28px, `md` 36px, `lg` 40px, and `xl` 48px. The control is as high as an
	 * `IconButton` of the same size, or a `Button` with any `appearance` except
	 * `"link"`. At `xs`, the labels are `text-xs`, so they have room inside the
	 * 16px thumb. The items do not accept `size`, so the items of one control
	 * always share one height.
	 */
	size?: SegmentedControlSize;
};

/**
 * The props of `SegmentedControl.Item`: the same props as `RadioGroup.Item`,
 * including `value` and `disabled`.
 */
type SegmentedControlItemProps = RadioPrimitive.ItemProps;

/**
 * A row of segments, one checked at a time, in a bordered track. A tinted
 * thumb slides to the checked `SegmentedControl.Item`. It is a radio group of
 * native radios: it renders `role="radiogroup"`, arrow keys move the checked
 * item, and with a `name` it submits its value in a form.
 *
 * Name it with `aria-label`, or with `aria-labelledby` that points at a
 * visible label. A mouse or a finger can drag the thumb. A sideways drag on
 * the checked item moves the thumb with the pointer. On release, the thumb
 * slides to the nearest enabled item, and that item becomes checked. A flick
 * carries the thumb further.
 *
 * | Data Attribute  | Value                 | Description                                         |
 * | --------------- | --------------------- | --------------------------------------------------- |
 * | `data-size`     | `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | The `size` prop. |
 * | `data-dragging` | present during a drag | The thumb follows the pointer. Presence-only.       |
 *
 * @see https://mantle.ngrok.com/components/forms/segmented-control#segmentedcontrolroot
 *
 * @example
 * ```tsx
 * <SegmentedControl.Root aria-label="Environment" defaultValue="production">
 *   <SegmentedControl.Item value="development">Dev</SegmentedControl.Item>
 *   <SegmentedControl.Item value="staging">Staging</SegmentedControl.Item>
 *   <SegmentedControl.Item value="production">Prod</SegmentedControl.Item>
 * </SegmentedControl.Root>
 * ```
 */
// Why no asChild: the group owns the native radios that carry the arrow keys and the form value.
const Root = ({
	"data-slot": dataSlot,
	children,
	className,
	ref,
	size = "md",
	style,
	...props
}: SegmentedControlRootProps) => {
	// Why a name for each control: anchor names are global, so two controls on one
	// page would otherwise share one checked item.
	const thumbAnchor = `--segmented-control-thumb${useId().replaceAll(/[^\w-]/g, "")}`;
	const groupRef = useRef<HTMLElement>(null);
	const composedRef = useComposedRefs(ref, groupRef);
	return (
		<SizeContext.Provider value={size}>
			<RadioPrimitive.Root
				data-slot={joinDataSlot(dataSlot, "segmented-control")}
				data-size={size}
				className={cx(
					// Why: the same panel as `ButtonGroup`, so a md control matches one around `sm` ghost `IconButton`s.
					"border-form bg-form relative flex flex-row flex-nowrap gap-0.5 rounded-md border p-0.75",
					rootSizeClasses[size],
					// Why a pseudo-element: one thumb slides to the checked item, and no
					// element sits beside the consumer's children. Why 2px: it is the track
					// radius less the border and the padding, so the thumb follows the track corner.
					"before:absolute before:rounded-xs before:bg-neutral-500/15",
					"before:[position-anchor:var(--_segmented-control-thumb)] before:top-[anchor(top)] before:left-[anchor(left)] before:w-[anchor-size(width)] before:h-[anchor-size(height)]",
					// Why only width: `useSegmentedThumb` slides the thumb, because a jump of the anchor animates in no browser but Chromium.
					"motion-safe:before:transition-[width] motion-safe:before:duration-200 motion-safe:before:ease-out-strong",
					// Why a private variable: during a drag, the thumb follows the pointer off its anchor.
					"before:translate-x-(--_segmented-control-thumb-offset,0px) data-dragging:cursor-grabbing",
					className,
				)}
				style={{ ...$cssProperties({ "--_segmented-control-thumb": thumbAnchor }), ...style }}
				{...props}
				ref={composedRef}
			>
				{children}
				<Thumb groupRef={groupRef} />
			</RadioPrimitive.Root>
		</SizeContext.Provider>
	);
};

/** Slides the thumb of the group around it to the checked value. Renders nothing. */
const Thumb = ({ groupRef }: { groupRef: RefObject<HTMLElement | null> }) => {
	useSegmentedThumb(groupRef, RadioPrimitive.useRadioGroupValue());
	return null;
};

/**
 * One segment of a `SegmentedControl.Root`: a `<div>` with a native
 * radio that grows to share the row and keeps its label on one line. Keep the label to one or
 * two words. An icon-only item needs its name in `sr-only` text or
 * `aria-label`. An item whose children are an `svg` and `sr-only` text is
 * square, like an `IconButton`.
 *
 * Inside `Field.Control`, the item picks up `aria-invalid`,
 * `aria-errormessage`, and `aria-describedby`.
 * Style its state with `has-[>input:checked]:`, `has-[>input:disabled]:`,
 * and `has-[>input:focus-visible]:`.
 *
 * | Data Attribute    | Value                 | Description                                 |
 * | ----------------- | --------------------- | ------------------------------------------- |
 * | `data-thumb-over` | present during a drag | The thumb is over this item. Presence-only. |
 *
 * @see https://mantle.ngrok.com/components/forms/segmented-control#segmentedcontrolitem
 *
 * @example
 * ```tsx
 * <SegmentedControl.Root aria-label="Environment" defaultValue="production">
 *   <SegmentedControl.Item value="development">Dev</SegmentedControl.Item>
 *   <SegmentedControl.Item value="staging">Staging</SegmentedControl.Item>
 *   <SegmentedControl.Item value="production">Prod</SegmentedControl.Item>
 * </SegmentedControl.Root>
 * ```
 */
// Why no asChild: the item is the `<div>` that holds its native radio.
const Item = ({ className, ...props }: SegmentedControlItemProps) => {
	const size = useContext(SizeContext);
	invariant(size != null, "SegmentedControl.Item must be rendered inside SegmentedControl.Root.");
	return (
		<RadioPrimitive.Item
			part="segmented-control-item"
			className={cx(
				"group/radio [&_label]:cursor-inherit text-strong font-medium relative flex flex-1 select-none items-center justify-center gap-2 rounded-xs",
				itemSizeClasses[size],
				// Why nowrap: `SegmentedControl.Root` has a fixed height, so a wrapped label spills out of the item.
				"whitespace-nowrap",
				// Why: an icon and its `sr-only` name make a square item, like an `IconButton`. CSS cannot see a text node,
				// so the 2px padding keeps a bare text label beside the icon readable when it matches too.
				"has-[>[data-slot=segmented-control-item-label]>svg]:not-has-[>[data-slot=segmented-control-item-label]>:not(svg,.sr-only)]:aspect-square",
				"has-[>[data-slot=segmented-control-item-label]>svg]:not-has-[>[data-slot=segmented-control-item-label]>:not(svg,.sr-only)]:px-0.5",
				"has-[>input:focus-visible]:focus-ring has-[>input:focus-visible]:z-1",
				"cursor-pointer has-[>input:disabled]:cursor-default has-[>input:disabled]:opacity-50",
				// Why not the checked item: its hover tint would stack on the thumb.
				"not-has-[>input:checked]:not-has-[>input:disabled]:hover:bg-neutral-500/10",
				// Why an anchor: the thumb slides under the checked item.
				"has-[>input:checked]:[anchor-name:var(--_segmented-control-thumb)]",
				// Why pan-y: a sideways swipe on the checked item drags the thumb, and the page still scrolls.
				"has-[>input:checked]:touch-pan-y",
				// Why: a browser with no anchor positioning draws no thumb, so the item fills itself.
				"not-supports-[anchor-name:--a]:has-[>input:checked]:bg-neutral-500/15",
				className,
			)}
			{...props}
		/>
	);
};

export {
	//,
	Item,
	Root,
};
