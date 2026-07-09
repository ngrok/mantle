"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ComponentProps } from "react";
import { useContext } from "react";
import { cx } from "../../utils/cx/cx.js";
import { FieldControlContext } from "../field/field-context.js";

type SliderBaseProps = Omit<ComponentProps<typeof SliderPrimitive.Root>, "defaultValue" | "value">;

/**
 * Value props for the {@link Slider} component. Either both `defaultValue` and
 * `value` must be the same type (both `number` or both `number[]`), or only one
 * may be provided.
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
		 * @default "bg-accent-500"
		 */
		color?: `bg-${string}`;
		/**
		 * Whether to show tick marks along the track at each `step` interval.
		 * @default false
		 */
		showTicks?: boolean;
	};

/**
 * An input where the user selects a value from within a given range.
 *
 * When composing with `Field.Item`, wrap `Slider` in `Field.Control`.
 * `Field.Control` flows `aria-invalid`, `aria-describedby`, and
 * `aria-errormessage` onto each thumb via `FieldControlContext`. Because
 * slider thumbs are ARIA slider widgets rather than native labelable controls,
 * pass `aria-label` or `aria-labelledby` to `Slider`; Mantle forwards those
 * labels to the rendered thumb(s).
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
	"aria-describedby": ariaDescribedBy,
	"aria-errormessage": ariaErrorMessage,
	"aria-invalid": ariaInvalid,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	className,
	color = "bg-accent-600",
	defaultValue,
	id,
	max = 100,
	min = 0,
	minStepsBetweenThumbs = 1,
	name,
	step = 1,
	showTicks = false,
	value,
	...props
}: SliderProps) {
	const fieldControl = useContext(FieldControlContext);
	const normalizedValue = value != null ? (Array.isArray(value) ? value : [value]) : undefined;
	const normalizedDefaultValue =
		defaultValue != null
			? Array.isArray(defaultValue)
				? defaultValue
				: [defaultValue]
			: undefined;
	const values = normalizedValue ?? normalizedDefaultValue ?? [min];
	const tickCount = computeTickCount(showTicks, min, max, step);

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			defaultValue={normalizedDefaultValue}
			value={normalizedValue}
			{...(fieldControl
				? {}
				: {
						"aria-describedby": ariaDescribedBy,
						"aria-errormessage": ariaErrorMessage,
						"aria-invalid": ariaInvalid,
						id,
					})}
			min={min}
			minStepsBetweenThumbs={minStepsBetweenThumbs}
			max={max}
			name={name}
			step={step}
			className={cx(
				"[--slider-thumb-size:--spacing(4.5)]",
				"data-orientation-vertical:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-orientation-vertical:h-full data-orientation-vertical:w-auto data-orientation-vertical:flex-col",
				tickCount > 0 && "mb-3",
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Track
				data-slot="slider-track"
				className={cx(
					"bg-neutral-300 rounded-full relative grow overflow-hidden",
					"data-orientation-horizontal:h-1.5 data-orientation-horizontal:w-full",
					"data-orientation-vertical:w-1.5 data-orientation-vertical:h-full",
				)}
			>
				<SliderPrimitive.Range
					data-slot="slider-range"
					className={cx(
						"absolute select-none data-orientation-horizontal:h-full data-orientation-vertical:w-full",
						color,
					)}
				/>
			</SliderPrimitive.Track>
			{Array.from({ length: values.length }, (_, index) => (
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					key={index}
					aria-describedby={fieldControl?.["aria-describedby"] ?? ariaDescribedBy}
					aria-errormessage={fieldControl?.["aria-errormessage"] ?? ariaErrorMessage}
					aria-invalid={fieldControl?.["aria-invalid"] ?? ariaInvalid}
					aria-label={resolveThumbAriaLabel({
						ariaLabel,
						index,
						thumbCount: values.length,
					})}
					aria-labelledby={ariaLabelledBy}
					// Only the first thumb receives the field-generated id so
					// Field.Label's htmlFor lands on a unique element. Range/
					// multi-thumb sliders share the surrounding aria wiring.
					id={index === 0 ? fieldControl?.id : undefined}
					className={cx(
						"bg-card border-card relative size-(--slider-thumb-size) rounded-full border",
						"shadow-md transition-[color,box-shadow]",
						"after:absolute after:-inset-2",
						"focus-visible:ring-3 focus-visible:ring-accent-500/20 focus-visible:outline-hidden",
						"block shrink-0 cursor-pointer select-none",
						"data-disabled:pointer-events-none data-disabled:cursor-default",
					)}
				/>
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
		</SliderPrimitive.Root>
	);
}

export { Slider };
export type { SliderProps };

// MARK: - Private

/**
 * Compute the number of tick marks to render based on the slider's range and step.
 * Returns 0 if ticks are disabled or if the step/range is invalid.
 */
function computeTickCount(showTicks: boolean, min: number, max: number, step: number): number {
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
