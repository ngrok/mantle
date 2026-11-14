"use client";

import { createContext, useContext, useId, useRef } from "react";
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
 * including `value`, `defaultValue`, `onChange`, `name`, `form`, and
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
 * slides to the checked `SegmentedControl.Item`. It is a radio group: it
 * renders `role="radiogroup"`, arrow keys move the checked item, and with a
 * `name` it submits its value in a form.
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
// Why no asChild: Headless UI renders the group and owns its roving focus and arrow keys.
const Root = ({
	"data-slot": dataSlot,
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
	useSegmentedThumb(groupRef);
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
					"has-[[aria-checked=true]:not([aria-disabled]):hover]:before:shadow",
					className,
				)}
				style={{ ...$cssProperties({ "--_segmented-control-thumb": thumbAnchor }), ...style }}
				{...props}
				ref={composedRef}
			/>
		</InsideRootContext.Provider>
	);
};

/**
 * One segment of a `SegmentedControl.Root`: a `role="radio"` item that grows
 * to share the row and keeps its label on one line. Keep the label to one or
 * two words. An icon-only item needs its name in `sr-only` text or
 * `aria-label`.
 *
 * Inside `Field.Control`, the item picks up `aria-invalid`,
 * `aria-errormessage`, and `aria-describedby`.
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
// Why no asChild: the item takes Headless UI's `as`, which keeps its radio wiring.
const Item = ({ "data-slot": dataSlot, className, ref, ...props }: SegmentedControlItemProps) => {
	invariant(
		useContext(InsideRootContext),
		"SegmentedControl.Item must be rendered inside SegmentedControl.Root.",
	);
	return (
		<RadioPrimitive.Item
			data-slot={joinDataSlot(dataSlot, "segmented-control-item")}
			className={cx(
				"group/radio [&_label]:cursor-inherit relative flex flex-1 select-none items-center justify-center gap-2 rounded-md px-3 text-sm",
				// Why nowrap: `SegmentedControl.Root` has a fixed height, so a wrapped label spills out of the item.
				"whitespace-nowrap",
				"focus-visible:ring-focus-accent focus-visible:z-1 focus-visible:ring-4",
				"cursor-pointer aria-disabled:cursor-default focus:outline-hidden",
				"text-muted not-aria-disabled:hover:text-strong aria-disabled:opacity-50",
				// Why a lighter tint: hover moves an item toward the raised thumb in both themes.
				"not-aria-disabled:hover:bg-white/60 dark:not-aria-disabled:hover:bg-neutral-500/10",
				// Why an anchor: the thumb slides under the checked item.
				"aria-checked:not-in-data-dragging:text-strong aria-checked:[anchor-name:var(--_segmented-control-thumb)]",
				// Why: during a drag, the label under the thumb is strong, and the checked item can be away from it.
				"data-thumb-over:text-strong",
				// Why pan-y: a sideways swipe on the checked item drags the thumb, and the page still scrolls.
				"aria-checked:touch-pan-y",
				// Why: a browser with no anchor positioning draws no thumb, so the item raises itself.
				"not-supports-[anchor-name:--a]:aria-checked:bg-card not-supports-[anchor-name:--a]:aria-checked:shadow-sm dark:not-supports-[anchor-name:--a]:aria-checked:bg-neutral-300",
				className,
			)}
			{...props}
			ref={ref}
		/>
	);
};

/**
 * A row of segments that switches between a few short options, like a view
 * or an environment. A raised thumb slides to the checked item,
 * and a mouse or a finger can drag it. It is a radio group underneath, with
 * the same keyboard, ARIA, and form contract as `RadioGroup`.
 *
 * @useWhen Switch between a few short options, like a view or an environment, in one row.
 *
 * @siblings
 * - `RadioGroup`: a form field whose options need a description, or stack in a column.
 * - `Tabs`: each option shows its own panel of content.
 * - `Select`: the set is long, or the row has little space.
 *
 * @see https://mantle.ngrok.com/components/forms/segmented-control
 *
 * @example
 * Composition:
 * ```
 * SegmentedControl.Root
 * └── SegmentedControl.Item
 * ```
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
const SegmentedControl = {
	/**
	 * One segment of a `SegmentedControl.Root`: a `role="radio"` item that grows
	 * to share the row and keeps its label on one line.
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
	Item,
	/**
	 * A row of segments, one checked at a time, on a dim track. A raised thumb
	 * slides to the checked `SegmentedControl.Item`.
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
	Root,
} as const;

export {
	//,
	SegmentedControl,
};
