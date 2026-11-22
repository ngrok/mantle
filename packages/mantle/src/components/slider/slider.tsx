"use client";

import type { ComponentProps, CSSProperties } from "react";
import { useContext } from "react";
import { composeHandlers } from "../../behaviors/compose-handlers.js";
import { useSlider } from "../../behaviors/use-slider.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { FieldControlContext } from "../field/field-context.js";

type SliderBaseProps = Omit<ComponentProps<"span">, "defaultValue" | "dir" | "value"> & {
	/**
	 * The text direction of the slider. When omitted, the slider follows the
	 * `direction` it inherits from the page.
	 */
	dir?: "ltr" | "rtl";
	/**
	 * When `true`, prevents the user from interacting with the slider. A disabled
	 * slider submits no value with its form.
	 * @default false
	 */
	disabled?: boolean;
	/**
	 * The `id` of the form the slider's inputs belong to, when the slider sits
	 * outside that form.
	 */
	form?: string;
	/**
	 * Whether the slider is visually inverted: `max` sits at the start of a
	 * horizontal track, or at the top of a vertical track.
	 * @default false
	 */
	inverted?: boolean;
	/**
	 * The maximum value.
	 * @default 100
	 */
	max?: number;
	/**
	 * The minimum value.
	 * @default 0
	 */
	min?: number;
	/**
	 * The fewest steps that must stay between two thumbs.
	 * @default 1
	 */
	minStepsBetweenThumbs?: number;
	/**
	 * The name that the slider's value submits under with its form. A slider with
	 * more than one thumb submits one value for each thumb under `name[]`.
	 */
	name?: string;
	/**
	 * Event handler called when the value changes.
	 */
	onValueChange?: (value: number[]) => void;
	/**
	 * Event handler called when the value changes at the end of an interaction:
	 * once for each key press, and when a drag that changed the value ends.
	 */
	onValueCommit?: (value: number[]) => void;
	/**
	 * The direction of the track.
	 * @default "horizontal"
	 */
	orientation?: "horizontal" | "vertical";
	/**
	 * Whether a thumb stops at its neighbor instead of passing it.
	 * @default false
	 */
	preserveThumbOrder?: boolean;
	/**
	 * The stepping interval.
	 * @default 1
	 */
	step?: number;
};

/**
 * Value props for the {@link Slider} component. Either both `defaultValue` and
 * `value` must be the same type (both `number` or both `number[]`), or only one
 * may be set.
 */
type SliderValueProps =
	| {
			/**
			 * The value of the slider when initially rendered. Use when you do not need
			 * to control the state of the slider.
			 */
			defaultValue?: number;
			/**
			 * The controlled value of the slider. Must be used with `onValueChange`.
			 */
			value?: number;
	  }
	| {
			/**
			 * The values of the slider when initially rendered. Use when you do not need
			 * to control the state of the slider. Pass an array to create a range slider
			 * with multiple thumbs.
			 */
			defaultValue?: number[];
			/**
			 * The controlled values of the slider. Must be used with `onValueChange`.
			 * Pass an array to create a range slider with multiple thumbs.
			 */
			value?: number[];
	  };

/**
 * Props for the {@link Slider} component.
 */
type SliderProps = SliderBaseProps &
	SliderValueProps & {
		/**
		 * The color of the slider range. Accepts any Tailwind `bg-*` class.
		 * @default "bg-accent-600"
		 */
		color?: `bg-${string}`;
		/**
		 * Whether to show tick marks along the track: one per `step`, spread
		 * evenly across the track. When the range is not a multiple of `step`,
		 * the ticks do not land on the step values.
		 * @default false
		 */
		showTicks?: boolean;
	} & WithDataSlot;

/**
 * An input where the user selects a value from within a given range.
 *
 * Each thumb is a native `<input type="range">`, so the server HTML already
 * holds each thumb at its value, and assistive technology reads and sets it
 * with no JavaScript.
 *
 * When composing with `Field.Item`, wrap `Slider` in `Field.Control`.
 * `Field.Control` flows `aria-invalid`, `aria-describedby`, and
 * `aria-errormessage` onto each thumb via `FieldControlContext`, and its id
 * onto the first thumb. Pass `aria-label` or `aria-labelledby` to `Slider`;
 * Mantle forwards those labels to the rendered thumb(s). `aria-label` derives a
 * distinct name per thumb ("Minimum Price", "Maximum Price"). `aria-labelledby`
 * names every thumb with the same text, so prefer `aria-label` for a range
 * slider.
 *
 * | Data Attribute     | Value                          | Description                                    |
 * | ------------------ | ------------------------------ | ---------------------------------------------- |
 * | `data-orientation` | `"horizontal"` \| `"vertical"` | On the root. Mirrors `orientation`.            |
 * | `data-disabled`    | present when disabled          | On the root. Presence-only. Style with `data-disabled:`. |
 *
 * @useWhen Pick a number, or a range between two numbers, with a thumb that moves along a track.
 *
 * @siblings
 * - `Input`: the user types an exact number.
 *
 * @see https://mantle.ngrok.com/components/forms/slider
 *
 * @example
 * ```tsx
 * // single thumb
 * <Slider
 *   aria-label="Volume"
 *   defaultValue={75}
 *   max={100}
 *   step={1}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // range
 *  <Slider
 *    aria-label="Price"
 *    defaultValue={[25, 50]}
 *    max={100}
 *    step={5}
 *  />
 * ```
 *
 * @example
 * ```tsx
 * // multiple thumbs
 * <Slider
 *   aria-label="Breakpoint"
 *   defaultValue={[10, 20, 70]}
 *   max={100}
 *   step={10}
 *  />
 * ```
 */
function Slider({
	"data-slot": dataSlot,
	"aria-describedby": ariaDescribedBy,
	"aria-errormessage": ariaErrorMessage,
	"aria-invalid": ariaInvalid,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	className,
	color = "bg-accent-600",
	defaultValue,
	dir,
	disabled = false,
	form,
	id,
	inverted = false,
	max = 100,
	min = 0,
	minStepsBetweenThumbs = 1,
	name,
	onKeyDown,
	onPointerDown,
	onPointerMove,
	onPointerUp,
	onValueChange,
	onValueCommit,
	orientation = "horizontal",
	preserveThumbOrder = false,
	ref,
	step = 1,
	showTicks = false,
	value,
	...props
}: SliderProps) {
	const fieldControl = useContext(FieldControlContext);
	const { values, rootProps, getInputProps } = useSlider({
		value: toValueArray(value),
		defaultValue: toValueArray(defaultValue) ?? [min],
		onValueChange,
		onValueCommit,
		min,
		max,
		step,
		minStepsBetweenThumbs,
		preserveThumbOrder,
		orientation,
		inverted,
		dir,
		disabled,
	});
	const composedRef = useComposedRefs(ref, rootProps.ref);
	const tickCount = computeTickCount({ showTicks, min, max, step });
	const inputName = name != null && values.length > 1 ? `${name}[]` : name;

	return (
		// oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Why: the root takes presses on the track and keys that bubble from the thumbs; each thumb is a native range input with its own role.
		<span
			data-slot={joinDataSlot(dataSlot, "slider")}
			data-orientation={orientation}
			data-disabled={disabled ? "" : undefined}
			dir={dir}
			{...(fieldControl
				? {}
				: {
						"aria-describedby": ariaDescribedBy,
						"aria-errormessage": ariaErrorMessage,
						"aria-invalid": ariaInvalid,
						id,
					})}
			className={cx(
				"group/slider [--slider-thumb-size:--spacing(4.5)]",
				"relative flex w-full touch-none items-center select-none data-disabled:opacity-50",
				"data-orientation-vertical:h-full data-orientation-vertical:min-h-40 data-orientation-vertical:w-auto data-orientation-vertical:flex-col",
				tickCount > 0 && "mb-3",
				className,
			)}
			{...props}
			ref={composedRef}
			onKeyDown={composeHandlers(onKeyDown, rootProps.onKeyDown)}
			onPointerDown={composeHandlers(onPointerDown, rootProps.onPointerDown)}
			onPointerMove={composeHandlers(onPointerMove, rootProps.onPointerMove)}
			onPointerUp={composeHandlers(onPointerUp, rootProps.onPointerUp)}
		>
			<span
				data-slot="slider-track"
				className={cx(
					"bg-neutral-300 rounded-full relative grow overflow-hidden",
					"h-1.5 w-full group-data-orientation-vertical/slider:h-full group-data-orientation-vertical/slider:w-1.5",
				)}
			>
				<span
					data-slot="slider-range"
					className={cx(
						"absolute h-full select-none group-data-orientation-vertical/slider:h-auto group-data-orientation-vertical/slider:w-full",
						color,
					)}
					style={rangeStyle({ inverted, max, min, orientation, values })}
				/>
			</span>
			{values.map((thumbValue, index) => (
				<span
					// oxlint-disable-next-line react/no-array-index-key -- Why: a thumb is its position, and the values stay sorted.
					key={index}
					data-slot="slider-thumb"
					className={cx(
						"bg-static-white border-card size-(--slider-thumb-size) rounded-full border shadow-md",
						"hit-area absolute block shrink-0 cursor-pointer transition-[color,box-shadow] select-none",
						// Why: a press on a thumb grabs that thumb. With more than one thumb, a hit
						// area that is wider than the thumb along the track covers an adjacent
						// thumb. A press beside a thumb then goes to the root, which moves the
						// nearest thumb.
						values.length > 1 &&
							"group-data-orientation-horizontal/slider:after:w-full group-data-orientation-vertical/slider:after:h-full",
						"has-focus-visible:ring-3 has-focus-visible:ring-accent-500/20",
						"group-data-disabled/slider:pointer-events-none group-data-disabled/slider:cursor-default",
					)}
					style={thumbStyle({ inverted, max, min, orientation, value: thumbValue })}
				>
					<input
						type="range"
						data-slot="slider-input"
						className={cx(
							"pointer-events-none absolute inset-0 m-0 size-full appearance-none opacity-0",
							// Why: Chromium reads a range input's orientation from its writing mode, not `aria-orientation`.
							"group-data-orientation-vertical/slider:[writing-mode:vertical-lr]",
						)}
						aria-describedby={fieldControl?.["aria-describedby"] ?? ariaDescribedBy}
						aria-errormessage={fieldControl?.["aria-errormessage"] ?? ariaErrorMessage}
						aria-invalid={fieldControl?.["aria-invalid"] ?? ariaInvalid}
						aria-label={resolveThumbAriaLabel({
							ariaLabel,
							index,
							thumbCount: values.length,
						})}
						aria-labelledby={ariaLabelledBy}
						aria-orientation={orientation}
						disabled={disabled}
						form={form}
						// Only the first thumb receives the field-generated id so
						// Field.Label's htmlFor lands on a unique element. Range/
						// multi-thumb sliders share the surrounding aria wiring.
						id={index === 0 ? fieldControl?.id : undefined}
						max={max}
						min={min}
						name={inputName}
						step={step}
						{...getInputProps(index)}
					/>
				</span>
			))}
			{tickCount > 0 && (
				<div
					data-slot="slider-ticks"
					className="absolute top-full mt-1.5 flex w-full justify-between px-[calc(var(--slider-thumb-size)/2)]"
					aria-hidden="true"
				>
					{Array.from({ length: tickCount }, (_, index) => (
						<span key={index} data-slot="slider-tick" className="bg-card-border h-1.5 w-px" />
					))}
				</div>
			)}
		</span>
	);
}

export { Slider };
export type { SliderProps };

// MARK: - Private

type Placement = {
	inverted: boolean;
	max: number;
	min: number;
	orientation: "horizontal" | "vertical";
};

/** The fraction of the way from `min` to `max` that `value` sits, from 0 to 1. */
function fractionOf({ max, min }: Placement, value: number): number {
	const fraction = (value - min) / (max - min);
	return Number.isFinite(fraction) ? Math.min(Math.max(fraction, 0), 1) : 0;
}

/** The edge of the track where `min` sits, as a CSS inset property. */
function startEdge({ inverted, orientation }: Placement) {
	if (orientation === "vertical") {
		return inverted ? "top" : "bottom";
	}
	return inverted ? "insetInlineEnd" : "insetInlineStart";
}

/** The end edge of the track, opposite {@link startEdge}. */
function endEdge({ inverted, orientation }: Placement) {
	if (orientation === "vertical") {
		return inverted ? "bottom" : "top";
	}
	return inverted ? "insetInlineStart" : "insetInlineEnd";
}

/**
 * Places a thumb at its value. The thumb stays inside the track, so its start
 * edge moves across the track length less one thumb. CSS logical insets follow
 * the `dir` the slider inherits, so the server HTML is the final paint.
 *
 * @example
 * ```ts
 * thumbStyle({ inverted: false, max: 100, min: 0, orientation: "horizontal", value: 25 });
 * // { insetInlineStart: "calc((100% - var(--slider-thumb-size)) * 0.25)" }
 * ```
 */
function thumbStyle(placement: Placement & { value: number }): CSSProperties {
	const offset = `calc((100% - var(--slider-thumb-size)) * ${fractionOf(placement, placement.value)})`;
	return { [startEdge(placement)]: offset };
}

/**
 * Places the range: from the lowest thumb to the highest, or from the start of
 * the track to the only thumb.
 *
 * @example
 * ```ts
 * rangeStyle({ inverted: false, max: 100, min: 0, orientation: "horizontal", values: [20, 70] });
 * // { insetInlineStart: "20%", insetInlineEnd: "30%" }
 * ```
 */
function rangeStyle(placement: Placement & { values: number[] }): CSSProperties {
	const fractions = placement.values.map((value) => fractionOf(placement, value));
	const start = fractions.length > 1 ? Math.min(...fractions) : 0;
	const end = 1 - Math.max(...fractions);
	return { [startEdge(placement)]: `${start * 100}%`, [endEdge(placement)]: `${end * 100}%` };
}

/** Wraps a single slider value in an array; an array passes through, and a nullish value stays `undefined`. */
function toValueArray(value: number | number[] | undefined): number[] | undefined {
	if (value == null) {
		return undefined;
	}
	return Array.isArray(value) ? value : [value];
}

/**
 * Compute the number of tick marks to render based on the slider's range and step.
 * Returns 0 if ticks are disabled or if the step/range is invalid.
 */
function computeTickCount({
	showTicks,
	min,
	max,
	step,
}: {
	showTicks: boolean;
	min: number;
	max: number;
	step: number;
}): number {
	const range = max - min;
	if (!showTicks || !Number.isFinite(range) || !Number.isFinite(step) || step <= 0 || range <= 0) {
		return 0;
	}
	return Math.floor(range / step) + 1;
}

function resolveThumbAriaLabel({
	ariaLabel,
	index,
	thumbCount,
}: {
	ariaLabel?: string;
	index: number;
	thumbCount: number;
}): string | undefined {
	if (!ariaLabel) {
		return undefined;
	}

	if (thumbCount === 1) {
		return ariaLabel;
	}

	if (thumbCount === 2) {
		return `${index === 0 ? "Minimum" : "Maximum"} ${ariaLabel}`;
	}

	return `${ariaLabel} ${index + 1} of ${thumbCount}`;
}
