"use client";

import type { ComponentProps, ReactNode } from "react";
import { createContext, use, useState } from "react";
import invariant from "tiny-invariant";
import { composeHandlers } from "../../behaviors/compose-handlers.js";
import { onStepGrid, sliderBehavior, sliderRootRef, sliderStyles } from "../../behaviors/slider.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { $cssProperties } from "../../types/css-properties.js";
import { clsx } from "../../utils/cx/clsx.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";

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
type SliderStateProps =
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
	SliderStateProps & {
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
		/**
		 * The text of a value. It sets `aria-valuetext` on each thumb, and the text
		 * of each {@link SliderValue}. When omitted, a value reads as its number.
		 *
		 * @example
		 * ```tsx
		 * <Slider aria-label="Price" defaultValue={40} formatValue={(value) => `$${value}`} />
		 * ```
		 */
		formatValue?: (value: number) => string;
		/**
		 * Optional {@link SliderValue} parts, which show the value while a pointer
		 * drags a thumb. Pass nothing else.
		 */
		children?: ReactNode;
	} & WithDataSlot;

/**
 * An input where the user selects a value from within a given range.
 *
 * Each thumb is a native `<input type="range">`, so the server HTML already
 * holds each thumb at its value, and assistive technology reads and sets it
 * with no JavaScript. An uncontrolled slider keeps its values in the DOM and
 * renders nothing while the user drags.
 *
 * `aria-invalid`, `aria-describedby`, and `aria-errormessage` go onto each
 * thumb, and `id` onto the first thumb, so a `<label htmlFor>` focuses it.
 * When composing with `Field.Item`, wrap `Slider` in `Field.Control`, which
 * passes those props. Pass `aria-label` or `aria-labelledby` to `Slider`;
 * Mantle forwards those labels to the rendered thumb(s). `aria-label` derives a
 * distinct name per thumb ("Minimum Price", "Maximum Price"). `aria-labelledby`
 * names every thumb with the same text, so prefer `aria-label` for a range
 * slider.
 *
 * | Data Attribute     | Value                          | Description                                    |
 * | ------------------ | ------------------------------ | ---------------------------------------------- |
 * | `data-orientation` | `"horizontal"` \| `"vertical"` | On the root. Mirrors `orientation`.            |
 * | `data-disabled`    | present when disabled          | On the root. Presence-only. Style with `data-disabled:`. |
 * | `data-track-press` | present during a glide         | On the root while a thumb glides after a press on the track. Presence-only. |
 * | `data-dragging`    | present during a drag          | On the root while a pointer drags a thumb. Presence-only. |
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
	children,
	className,
	color = "bg-accent-600",
	defaultValue,
	formatValue,
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
	onLostPointerCapture,
	onPointerMove,
	onValueChange,
	onValueCommit,
	orientation = "horizontal",
	preserveThumbOrder = false,
	ref,
	step = 1,
	showTicks = false,
	style,
	value,
	...props
}: SliderProps) {
	const controlled = value !== undefined;
	// Why the first `defaultValue` only: an uncontrolled slider keeps its values in
	// the DOM, and a later default must not move the thumbs away from the inputs.
	const [initialValues] = useState(() => toValueArray(defaultValue) ?? [min]);
	const values = toValueArray(value) ?? initialValues;
	const composedRef = useComposedRefs(ref, sliderRootRef);
	const { rootProps, inputProps } = sliderBehavior({
		controlled,
		min,
		max,
		step,
		minStepsBetweenThumbs,
		preserveThumbOrder,
		orientation,
		inverted,
		dir,
		onValueChange,
		onValueCommit,
		formatValue,
	});
	const styles = sliderStyles(values, min);
	const tickCount = computeTickCount({ showTicks, min, max, step });
	const inputName = name != null && values.length > 1 ? `${name}[]` : name;

	const root = (
		// oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Why: the root takes presses on the track and keys that bubble from the thumbs; each thumb is a native range input with its own role.
		<span
			data-slot={joinDataSlot(dataSlot, "slider")}
			data-orientation={orientation}
			data-disabled={disabled ? "" : undefined}
			dir={dir}
			className={cx(
				"group/slider [--slider-thumb-size:--spacing(4.5)]",
				"relative flex w-full touch-none items-center select-none data-disabled:opacity-50",
				// Why a `::before`: it paints under the track and the thumbs with no stacking context,
				// so each thumb's input stays above the hit area of an adjacent slider too. It is 24px
				// for a mouse (the WCAG minimum target) and 44px for a finger, because it covers what
				// sits beside the track.
				"before:absolute before:top-1/2 before:left-1/2 before:-translate-1/2 before:size-[max(100%,--spacing(6))] pointer-coarse:before:size-[max(100%,--spacing(11))] data-disabled:before:pointer-events-none",
				"data-orientation-vertical:h-full data-orientation-vertical:min-h-40 data-orientation-vertical:w-auto data-orientation-vertical:flex-col",
				tickCount > 0 && "mb-3",
				// Why a container: a value label at a thumb measures the slider's width to stay inside it.
				children != null && "data-orientation-horizontal:@container",
				className,
			)}
			style={$cssProperties({
				"--_min": min,
				"--_max": max,
				"--_inv": inverted ? 1 : 0,
				...style,
			})}
			{...props}
			ref={composedRef}
			onKeyDown={composeHandlers(onKeyDown, rootProps.onKeyDown)}
			onPointerDown={composeHandlers(onPointerDown, rootProps.onPointerDown)}
			onPointerMove={composeHandlers(onPointerMove, rootProps.onPointerMove)}
			onLostPointerCapture={composeHandlers(onLostPointerCapture, rootProps.onLostPointerCapture)}
		>
			<span
				data-slot="slider-track"
				className="bg-neutral-300 rounded-full relative grow overflow-hidden h-1.5 w-full group-data-orientation-vertical/slider:h-full group-data-orientation-vertical/slider:w-1.5"
			>
				<span
					data-slot="slider-range"
					className={clsx(
						"absolute h-full select-none group-data-orientation-vertical/slider:h-auto group-data-orientation-vertical/slider:w-full",
						// Why `--_s` and `--_e`: the insets of the start and the end edge, as
						// fractions of the track. `--_inv` swaps the ends of an inverted track.
						"[--_a:clamp(0,(var(--_start)_-_var(--_min))/(var(--_max)_-_var(--_min)),1)] [--_b:clamp(0,(var(--_end)_-_var(--_min))/(var(--_max)_-_var(--_min)),1)]",
						"[--_s:calc(var(--_inv)_*_(1_-_var(--_b))_+_(1_-_var(--_inv))_*_var(--_a))] [--_e:calc(var(--_inv)_*_var(--_a)_+_(1_-_var(--_inv))_*_(1_-_var(--_b)))]",
						"group-data-orientation-horizontal/slider:inset-s-[calc(var(--_s)*100%)] group-data-orientation-horizontal/slider:inset-e-[calc(var(--_e)*100%)]",
						"group-data-orientation-vertical/slider:bottom-[calc(var(--_s)*100%)] group-data-orientation-vertical/slider:top-[calc(var(--_e)*100%)]",
						"group-data-track-press/slider:motion-safe:transition-[inset-inline-start,inset-inline-end,top,bottom] group-data-track-press/slider:motion-safe:duration-200 group-data-track-press/slider:motion-safe:ease-out-strong",
						color,
					)}
					style={$cssProperties(styles.range)}
				/>
			</span>
			{values.map((_thumbValue, index) => (
				<span
					// oxlint-disable-next-line react/no-array-index-key -- Why: a thumb is its position, and the values stay sorted.
					key={index}
					data-slot="slider-thumb"
					className={cx(
						"bg-static-white border-card size-(--slider-thumb-size) rounded-full border shadow-md",
						"hit-area absolute block shrink-0 cursor-pointer transition-[color,box-shadow] select-none",
						// Why `--_f`: the thumb's inset from the start edge, as a fraction of the
						// track less one thumb, so the thumb stays inside the track.
						"[--_f:calc(var(--_inv)_+_(1_-_var(--_inv)_*_2)_*_clamp(0,(var(--_value)_-_var(--_min))/(var(--_max)_-_var(--_min)),1))]",
						"group-data-orientation-horizontal/slider:inset-s-[calc(var(--_f)*(100%-var(--slider-thumb-size)))]",
						"group-data-orientation-vertical/slider:bottom-[calc(var(--_f)*(100%-var(--slider-thumb-size)))]",
						// Why: a press on a thumb grabs that thumb. With more than one thumb, a hit
						// area that is wider than the thumb along the track covers an adjacent
						// thumb. A press beside a thumb then goes to the root, which moves the
						// nearest thumb.
						values.length > 1 &&
							"group-data-orientation-horizontal/slider:after:w-full group-data-orientation-vertical/slider:after:h-full",
						// Why the outline: forced-colors mode drops the ring's box shadow and paints the transparent outline.
						"has-focus-visible:ring-3 has-focus-visible:ring-accent-500/20 has-focus-visible:outline-hidden",
						// Why only on a press of the track: a drag and a key must move at once.
						"group-data-track-press/slider:motion-safe:transition-[color,box-shadow,inset-inline-start,bottom] group-data-track-press/slider:motion-safe:duration-200 group-data-track-press/slider:motion-safe:ease-out-strong",
						"group-data-disabled/slider:pointer-events-none group-data-disabled/slider:cursor-default",
					)}
					style={$cssProperties(styles.thumbs[index] ?? {})}
				>
					<input
						type="range"
						data-slot="slider-input"
						// Why `z-1` and no `pointer-events: none`: the input sits above the hit area of its thumb, so a test finds the thumb by role and clicks it as it would a native input.
						// Why the writing mode: Chromium reads a range input's orientation from it, not from `aria-orientation`.
						className="absolute inset-0 z-1 m-0 size-full cursor-inherit appearance-none opacity-0 group-data-orientation-vertical/slider:[writing-mode:vertical-lr]"
						aria-describedby={ariaDescribedBy}
						aria-errormessage={ariaErrorMessage}
						aria-invalid={ariaInvalid}
						aria-label={resolveThumbAriaLabel({
							ariaLabel,
							index,
							thumbCount: values.length,
						})}
						aria-labelledby={ariaLabelledBy}
						aria-orientation={orientation}
						disabled={disabled}
						form={form}
						// Why the first thumb: an `id` names one element, so a `<label htmlFor>`
						// or `Field.Label` focuses the first thumb.
						id={index === 0 ? id : undefined}
						max={max}
						min={min}
						name={inputName}
						// Why "any" off the grid: the browser snaps a value to `step`, and then the
						// value it reads out and submits differs from the thumb.
						step={onStepGrid(values[index] ?? min, { min, step }) ? step : "any"}
						{...(controlled ? { value: values[index] } : { defaultValue: values[index] })}
						aria-valuetext={formatValue?.(values[index] ?? min)}
						onChange={inputProps.onChange}
					/>
					{children != null && (
						<SliderThumbIndexContext value={index}>{children}</SliderThumbIndexContext>
					)}
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
			{children != null && (
				<SliderThumbIndexContext value={null}>{children}</SliderThumbIndexContext>
			)}
		</span>
	);
	return root;
}

/** The thumb that a {@link SliderValue} sits in, `null` above the track, or `undefined` outside a `Slider`. */
const SliderThumbIndexContext = createContext<number | null | undefined>(undefined);

/**
 * Props for the {@link SliderValue} component.
 */
type SliderValueProps = Omit<ComponentProps<"span">, "children"> & {
	/**
	 * Where the value shows: above each thumb, which it follows, or once above
	 * the center of the track, with every value of a range.
	 * @default "thumb"
	 */
	placement?: "thumb" | "track";
} & WithDataSlot;

/**
 * The value of a {@link Slider}, in a small label that shows while a pointer or
 * a finger drags a thumb, and while a thumb glides to a press on the track. It
 * hides at rest and under keyboard focus. Place it as a child of `Slider`.
 *
 * Why not on keyboard focus: a sighted keyboard user sees the thumb move and the
 * focus ring, and a label on each focus covers content as the user tabs through
 * a form. A screen reader reads the value from the thumb, with `formatValue` as
 * `aria-valuetext`, so the label stays out of the accessibility tree.
 *
 * CSS places the label from the thumb's value. With `placement="thumb"`, it
 * stays inside the slider's width at each end.
 *
 * | Data Attribute    | Value               | Description                                               |
 * | ----------------- | ------------------- | --------------------------------------------------------- |
 * | `data-placement`  | `"thumb"` \| `"track"` | Mirrors `placement`.                                  |
 *
 * @example
 * ```tsx
 * <Slider aria-label="Volume" defaultValue={40} formatValue={(value) => `${value}%`}>
 *   <SliderValue />
 * </Slider>
 * ```
 */
function SliderValue({
	"data-slot": dataSlot,
	className,
	placement = "thumb",
	ref,
	...props
}: SliderValueProps) {
	const index = use(SliderThumbIndexContext);
	const composedRef = useComposedRefs(ref, sliderValueRef);
	invariant(index !== undefined, "SliderValue must be rendered inside a Slider.");
	// Why: `Slider` renders its children in each thumb and above the track, and each placement keeps one.
	if ((placement === "thumb") !== (index != null)) {
		return null;
	}
	return (
		<span
			data-slot={joinDataSlot(dataSlot, "slider-value")}
			data-placement={placement}
			aria-hidden="true"
			// Why: the label writes its own text, and a page translation must not hold a copy.
			translate="no"
			className={cx(
				"bg-tooltip text-tooltip pointer-events-none absolute z-2 w-max rounded-md px-2 py-1 text-xs font-sans whitespace-nowrap tabular-nums shadow select-none",
				"[--_dir:1] rtl:[--_dir:-1]",
				// Why: shown only while a pointer drags or a thumb glides. Enter in 200ms, exit in 150ms.
				"scale-95 opacity-0 motion-safe:transition-[opacity,scale] motion-safe:duration-150 motion-safe:ease-out-strong",
				"group-data-dragging/slider:scale-100 group-data-dragging/slider:opacity-100 group-data-dragging/slider:motion-safe:duration-200",
				"group-data-track-press/slider:scale-100 group-data-track-press/slider:opacity-100 group-data-track-press/slider:motion-safe:duration-200",
				placement === "thumb"
					? [
							"group-data-orientation-horizontal/slider:inset-s-1/2 group-data-orientation-horizontal/slider:bottom-full group-data-orientation-horizontal/slider:mb-2 group-data-orientation-horizontal/slider:origin-bottom",
							// Why `--_c` and the clamp: `--_c` is the thumb's center from the slider's start edge. The
							// label centers on the thumb, and at each end it stops at the slider's edge.
							"group-data-orientation-horizontal/slider:[--_c:calc(var(--_f)*(100cqw-var(--slider-thumb-size))+var(--slider-thumb-size)/2)]",
							"group-data-orientation-horizontal/slider:translate-x-[calc(var(--_dir)_*_clamp(-1_*_var(--_c),-50%,100cqw_-_var(--_c)_-_100%))]",
							"group-data-orientation-vertical/slider:inset-e-full group-data-orientation-vertical/slider:top-1/2 group-data-orientation-vertical/slider:me-2 group-data-orientation-vertical/slider:-translate-y-1/2 group-data-orientation-vertical/slider:origin-right rtl:group-data-orientation-vertical/slider:origin-left",
						]
					: [
							"inset-s-1/2 origin-bottom translate-x-[calc(var(--_dir)*-50%)]",
							"group-data-orientation-horizontal/slider:bottom-[calc(50%+var(--slider-thumb-size)/2+(--spacing(2)))]",
							"group-data-orientation-vertical/slider:bottom-full group-data-orientation-vertical/slider:mb-2",
						],
				className,
			)}
			{...props}
			ref={composedRef}
		/>
	);
}

/**
 * The ref callback of a value label. It writes the value text of its thumb, or
 * of every thumb above the track, and again after each `input` event that the
 * slider sends: a drag, a key, a form reset, or assistive technology.
 */
function sliderValueRef(label: HTMLSpanElement | null) {
	// Why the parent: a label at a thumb sits in the thumb, and a label above the track in the root.
	const parent = label?.parentElement;
	const root = label?.dataset.placement === "track" ? parent : parent?.parentElement;
	if (label == null || parent == null || root == null) {
		return;
	}
	const write = () => {
		const inputs = parent.querySelectorAll<HTMLInputElement>("[data-slot='slider-input']");
		label.textContent = [...inputs]
			.map((input) => input.getAttribute("aria-valuetext") ?? input.value)
			.join(" – ");
	};
	// Why a microtask: the slider paints a form reset and React renders a controlled value after the event.
	const follow = () => queueMicrotask(write);
	write();
	root.addEventListener("input", follow);
	return () => root.removeEventListener("input", follow);
}

export {
	//,
	Slider,
	SliderValue,
};
export type {
	//,
	SliderProps,
	SliderValueProps,
};

// MARK: - Private

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
