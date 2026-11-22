"use client";

import { createContext, useContext, useId, useRef } from "react";
import type { RefObject } from "react";
import invariant from "tiny-invariant";
import { $cssProperties } from "../../types/index.js";
import { useComposedRefs } from "../../utils/compose-refs/index.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import * as RadioPrimitive from "../radio-group/primitive.js";
import { useSegmentedThumb } from "./use-segmented-thumb.js";

/** Whether a part renders inside a `SegmentedControl.Root`. */
const InsideRootContext = createContext(false);

/**
 * The props of `SegmentedControl.Root`: the same props as `RadioGroup.Root`,
 * including `value`, `defaultValue`, `onValueChange`, `name`, `form`, and
 * `disabled`.
 */
type SegmentedControlRootProps = RadioPrimitive.RootProps;

/**
 * The props of `SegmentedControl.Item`: the same props as `RadioGroup.Item`,
 * including `value` and `disabled`.
 */
type SegmentedControlItemProps = RadioPrimitive.ItemProps;

/**
 * A row of segments, one checked at a time, on a dim track. A raised thumb
 * slides to the checked `SegmentedControl.Item`. It is a radio group of
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
	style,
	...props
}: SegmentedControlRootProps) => {
	// Why a name for each control: anchor names are global, so two controls on one
	// page would otherwise share one checked item.
	const thumbAnchor = `--segmented-control-thumb${useId().replaceAll(/[^\w-]/g, "")}`;
	const groupRef = useRef<HTMLElement>(null);
	const composedRef = useComposedRefs(ref, groupRef);
	return (
		<InsideRootContext.Provider value>
			<RadioPrimitive.Root
				data-slot={joinDataSlot(dataSlot, "segmented-control")}
				className={cx(
					// Why 0.625rem: the item radius (6px) and the padding (4px) add up to it.
					// The items and their focus rings then follow the track corner.
					"bg-neutral-500/10 relative flex h-9 flex-row flex-nowrap gap-px rounded-[0.625rem] p-1",
					// Why a pseudo-element: one thumb slides to the checked item, and no
					// element sits beside the consumer's children.
					"before:absolute before:rounded-md before:bg-card before:shadow-sm dark:before:bg-neutral-300",
					"before:[position-anchor:var(--_segmented-control-thumb)] before:top-[anchor(top)] before:left-[anchor(left)] before:w-[anchor-size(width)] before:h-[anchor-size(height)]",
					// Why only width: `useSegmentedThumb` slides the thumb, because a jump of the anchor animates in no browser but Chromium.
					"motion-safe:before:transition-[width] motion-safe:before:duration-200 motion-safe:before:ease-out-strong",
					// Why a private variable: during a drag, the thumb follows the pointer off its anchor.
					"before:translate-x-(--_segmented-control-thumb-offset,0px) data-dragging:cursor-grabbing",
					// Why: a white thumb cannot get lighter, so hover on it lifts the shadow.
					"has-[>*:hover>input:checked:enabled]:before:shadow",
					className,
				)}
				style={{ ...$cssProperties({ "--_segmented-control-thumb": thumbAnchor }), ...style }}
				{...props}
				ref={composedRef}
			>
				{children}
				<Thumb groupRef={groupRef} />
			</RadioPrimitive.Root>
		</InsideRootContext.Provider>
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
 * `aria-label`.
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
	invariant(
		useContext(InsideRootContext),
		"SegmentedControl.Item must be rendered inside SegmentedControl.Root.",
	);
	return (
		<RadioPrimitive.Item
			part="segmented-control-item"
			className={cx(
				"group/radio [&_label]:cursor-inherit relative flex flex-1 select-none items-center justify-center gap-2 rounded-md px-3 text-sm",
				// Why nowrap: `SegmentedControl.Root` has a fixed height, so a wrapped label spills out of the item.
				"whitespace-nowrap",
				"has-[>input:focus-visible]:focus-ring has-[>input:focus-visible]:z-1",
				"cursor-pointer has-[>input:disabled]:cursor-default",
				"text-muted not-has-[>input:disabled]:hover:text-strong has-[>input:disabled]:opacity-50",
				// Why a lighter tint: hover moves an item toward the raised thumb in both themes.
				"not-has-[>input:disabled]:hover:bg-white/60 dark:not-has-[>input:disabled]:hover:bg-neutral-500/10",
				// Why an anchor: the thumb slides under the checked item.
				"has-[>input:checked]:not-in-data-dragging:text-strong has-[>input:checked]:[anchor-name:var(--_segmented-control-thumb)]",
				// Why: during a drag, the label under the thumb is strong, and the checked item can be away from it.
				"data-thumb-over:text-strong",
				// Why pan-y: a sideways swipe on the checked item drags the thumb, and the page still scrolls.
				"has-[>input:checked]:touch-pan-y",
				// Why: a browser with no anchor positioning draws no thumb, so the item raises itself.
				"not-supports-[anchor-name:--a]:has-[>input:checked]:bg-card not-supports-[anchor-name:--a]:has-[>input:checked]:shadow-sm dark:not-supports-[anchor-name:--a]:has-[>input:checked]:bg-neutral-300",
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
