"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { useRef, useState } from "react";
import { useControllableState } from "./use-controllable-state.js";

type SliderOrientation = "horizontal" | "vertical";

type UseSliderOptions = {
	/** The controlled values, one for each thumb. */
	value: number[] | undefined;
	/** The values on the first render. */
	defaultValue: number[];
	onValueChange: ((value: number[]) => void) | undefined;
	/** Called once for each keyboard step, and at the end of a drag that changed a value. */
	onValueCommit: ((value: number[]) => void) | undefined;
	min: number;
	max: number;
	step: number;
	/** The fewest steps that must stay between two thumbs. */
	minStepsBetweenThumbs: number;
	/** Whether a thumb stops at its neighbor instead of passing it. */
	preserveThumbOrder: boolean;
	orientation: SliderOrientation;
	inverted: boolean;
	/** The text direction. When omitted, the root's computed `direction` decides. */
	dir: "ltr" | "rtl" | undefined;
	disabled: boolean;
};

/** The keys that move a thumb toward `min`, for each edge that `min` can sit on. */
const BACK_KEYS = {
	left: ["PageDown", "ArrowDown", "ArrowLeft"],
	right: ["PageDown", "ArrowDown", "ArrowRight"],
	bottom: ["PageDown", "ArrowDown", "ArrowLeft"],
	top: ["PageDown", "ArrowUp", "ArrowLeft"],
} as const;

const STEP_KEYS = new Set([
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"PageUp",
	"PageDown",
]);

/**
 * The behavior of a slider with one or more thumbs, after the
 * [WAI-ARIA APG slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/).
 * Each thumb is a native `<input type="range">`, which owns the role, the value
 * that assistive technology reads and sets, focus, `disabled`, and the form
 * value. The hook adds what the native input cannot do:
 *
 * - A press on the track moves the nearest thumb to the pointer. A press on a
 *   thumb grabs it where it is. A drag then follows the pointer.
 * - The keys follow `orientation`, `inverted`, and the text direction. Shift with
 *   an arrow key and PageUp or PageDown move 10 steps. Home and End move the
 *   focused thumb as far as its neighbors allow.
 * - Thumbs keep `minStepsBetweenThumbs` between them. A thumb that passes
 *   another swaps places with it and keeps focus, unless `preserveThumbOrder`.
 * - A form reset returns the values to the values of the first render.
 *
 * @example
 * ```tsx
 * const slider = useSlider({ value, defaultValue: [50], min: 0, max: 100, ... });
 * <span {...slider.rootProps}>
 *   {slider.values.map((thumbValue, index) => (
 *     <input key={index} type="range" {...slider.getInputProps(index)} />
 *   ))}
 * </span>
 * ```
 */
function useSlider({
	value,
	defaultValue,
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
}: UseSliderOptions) {
	const [values, setValues] = useControllableState({
		value,
		defaultValue,
		onChange: onValueChange,
	});
	const [initialValues] = useState(values);
	const rootRef = useRef<HTMLSpanElement | null>(null);
	const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
	const announcing = useRef(false);
	/** The drag in progress: the thumb, the root's box, the values at the start, and the grab offset in value units. */
	const slide = useRef<{
		index: number;
		rect: DOMRect;
		before: number[];
		edge: Edge;
		offset: number;
	} | null>(null);

	const edgeOfMin = (root: HTMLElement): Edge => {
		if (orientation === "vertical") {
			return inverted ? "top" : "bottom";
		}
		const rtl = (dir ?? getComputedStyle(root).direction) === "rtl";
		return rtl === inverted ? "left" : "right";
	};

	/** Snaps `next` to a step, applies it to the thumb at `index`, and focuses the thumb it lands on. */
	const update = (
		next: number,
		index: number,
		{ commit, keyboard }: { commit: boolean; keyboard: boolean },
	): number => {
		const result = nextValues({
			values,
			next,
			index,
			min,
			max,
			step,
			minStepsBetweenThumbs,
			preserveThumbOrder,
		});
		if (result == null) {
			return index;
		}
		inputsRef.current[result.index]?.focus({ preventScroll: true, focusVisible: keyboard });
		setValues(result.values);
		announce(result.values);
		if (commit) {
			onValueCommit?.(result.values);
		}
		return result.index;
	};

	/**
	 * Sends a bubbling `input` event from each input whose value changed, so a form
	 * or an ancestor `onChange` sees a change that the slider made.
	 */
	const announce = (next: number[]) => {
		announcing.current = true;
		for (const [index, input] of inputsRef.current.entries()) {
			const nextValue = next[index];
			if (input == null || nextValue == null || nextValue === values[index]) {
				continue;
			}
			// Why the prototype's setter: it skips React's value tracker, so React reads
			// the event as a change of a controlled input.
			Reflect.set(HTMLInputElement.prototype, "value", String(nextValue), input);
			input.dispatchEvent(new Event("input", { bubbles: true }));
		}
		announcing.current = false;
	};

	const resetToInitial = () => setValues(initialValues);

	const rootProps = {
		ref: rootRef,
		onPointerDown: (event: PointerEvent<HTMLSpanElement>) => {
			const root = rootRef.current;
			const target = event.target;
			if (disabled || event.button !== 0 || root == null || !(target instanceof Element)) {
				return;
			}
			target.setPointerCapture(event.pointerId);
			// Why: a press neither selects text nor moves focus to the root.
			event.preventDefault();
			const edge = edgeOfMin(root);
			const rect = root.getBoundingClientRect();
			const thumbIndex = inputsRef.current.findIndex((input) => input?.parentElement === target);
			const pressed = valueAtPoint({ event, rect, edge, min, max });
			const thumbValue = values[thumbIndex];
			if (thumbValue != null) {
				// Why the offset: a press on a thumb grabs it where it is, so the thumb
				// does not jump to the pointer on the first move.
				inputsRef.current[thumbIndex]?.focus({ preventScroll: true, focusVisible: false });
				slide.current = {
					index: thumbIndex,
					rect,
					before: values,
					edge,
					offset: pressed - thumbValue,
				};
				return;
			}
			const index = update(pressed, closestIndex(values, pressed), {
				commit: false,
				keyboard: false,
			});
			slide.current = { index, rect, before: values, edge, offset: 0 };
		},
		onPointerMove: (event: PointerEvent<HTMLSpanElement>) => {
			const current = slide.current;
			const target = event.target;
			if (
				current == null ||
				!(target instanceof Element) ||
				!target.hasPointerCapture(event.pointerId)
			) {
				return;
			}
			const next =
				valueAtPoint({ event, rect: current.rect, edge: current.edge, min, max }) - current.offset;
			current.index = update(next, current.index, { commit: false, keyboard: false });
		},
		onPointerUp: (event: PointerEvent<HTMLSpanElement>) => {
			const current = slide.current;
			const target = event.target;
			if (
				current == null ||
				!(target instanceof Element) ||
				!target.hasPointerCapture(event.pointerId)
			) {
				return;
			}
			target.releasePointerCapture(event.pointerId);
			slide.current = null;
			if (String(values) !== String(current.before)) {
				onValueCommit?.(values);
			}
		},
		onKeyDown: (event: KeyboardEvent<HTMLSpanElement>) => {
			const root = rootRef.current;
			const index = inputsRef.current.findIndex((input) => input === event.target);
			const current = values[index];
			if (disabled || root == null || current == null) {
				return;
			}
			const minDistance = minStepsBetweenThumbs * step;
			let next: number;
			if (event.key === "Home") {
				next = Math.max(min, (values[index - 1] ?? -Infinity) + minDistance);
			} else if (event.key === "End") {
				next = Math.min(max, (values[index + 1] ?? Infinity) - minDistance);
			} else if (STEP_KEYS.has(event.key)) {
				const back = BACK_KEYS[edgeOfMin(root)].some((key) => key === event.key);
				const skip = event.key.startsWith("Page") || event.shiftKey;
				next = nextStepValue(current, {
					min,
					step,
					direction: back ? -1 : 1,
					multiplier: skip ? 10 : 1,
				});
			} else {
				return;
			}
			// Why: the native input would step again, and in its own direction.
			event.preventDefault();
			update(next, index, { commit: true, keyboard: true });
		},
	};

	const getInputProps = (index: number) => ({
		ref: (input: HTMLInputElement | null) => {
			inputsRef.current[index] = input;
			// Why a ref callback on the first input: a form reset returns the values to
			// the values of the first render, and the listener lives as long as the input.
			const owner = index === 0 ? input?.form : null;
			if (owner == null) {
				return;
			}
			owner.addEventListener("reset", resetToInitial);
			return () => owner.removeEventListener("reset", resetToInitial);
		},
		value: values[index],
		// Why: assistive technology sets the value of a native range input directly.
		onChange: (event: { currentTarget: HTMLInputElement }) => {
			if (!announcing.current) {
				update(event.currentTarget.valueAsNumber, index, { commit: true, keyboard: true });
			}
		},
	});

	return { values, rootProps, getInputProps };
}

export {
	//,
	useSlider,
};

// MARK: - Private

/** The edge of the track where `min` sits. */
type Edge = keyof typeof BACK_KEYS;

/** The value under the pointer, scaled across the whole root. */
function valueAtPoint({
	event,
	rect,
	edge,
	min,
	max,
}: {
	event: { clientX: number; clientY: number };
	rect: DOMRect;
	edge: Edge;
	min: number;
	max: number;
}): number {
	const vertical = edge === "top" || edge === "bottom";
	const offset = vertical ? event.clientY - rect.top : event.clientX - rect.left;
	const length = vertical ? rect.height : rect.width;
	if (length === 0) {
		return min;
	}
	const fraction = offset / length;
	return min + (max - min) * (edge === "left" || edge === "top" ? fraction : 1 - fraction);
}

/**
 * The values after the thumb at `index` asks for `next`, and the index that the
 * thumb lands on once the values sort. `null` when nothing changes, or when two
 * thumbs would sit closer than `minStepsBetweenThumbs`.
 *
 * @example
 * ```ts
 * nextValues({ values: [40, 50], next: 57, index: 0, min: 0, max: 100, step: 5, minStepsBetweenThumbs: 1, preserveThumbOrder: false });
 * // { values: [50, 55], index: 1 }
 * ```
 */
function nextValues({
	values,
	next,
	index,
	min,
	max,
	step,
	minStepsBetweenThumbs,
	preserveThumbOrder,
}: {
	values: number[];
	next: number;
	index: number;
	min: number;
	max: number;
	step: number;
	minStepsBetweenThumbs: number;
	preserveThumbOrder: boolean;
}): { values: number[]; index: number } | null {
	const decimals = decimalCount(step);
	const snapped = clamp(round(Math.round((next - min) / step) * step + min, decimals), min, max);
	const minDistance = minStepsBetweenThumbs * step;
	const value = preserveThumbOrder
		? clamp(
				snapped,
				(values[index - 1] ?? min - minDistance) + minDistance,
				(values[index + 1] ?? max + minDistance) - minDistance,
			)
		: snapped;
	const sorted = values.with(index, value).toSorted((a, b) => a - b);
	const tooClose = sorted.some(
		(current, position) =>
			position > 0 && current - (sorted[position - 1] ?? current) < minDistance,
	);
	if (tooClose || String(sorted) === String(values)) {
		return null;
	}
	return { values: sorted, index: sorted[index] === value ? index : sorted.indexOf(value) };
}

/**
 * The value one keyboard step from `value`. A value off the step grid moves to
 * the next grid line in `direction`.
 */
function nextStepValue(
	value: number,
	{
		min,
		step,
		direction,
		multiplier,
	}: { min: number; step: number; direction: 1 | -1; multiplier: number },
): number {
	const decimals = decimalCount(step);
	const stepsFromMin = (value - min) / step;
	const nearest = Math.round(stepsFromMin);
	const aligned = round(nearest * step + min, decimals) === round(value, decimals);
	let steps = direction > 0 ? Math.ceil(stepsFromMin) : Math.floor(stepsFromMin);
	if (aligned) {
		steps = nearest + multiplier * direction;
	}
	return round(steps * step + min, decimals);
}

/** The index of the value nearest `next`; the first one on a tie. */
function closestIndex(values: number[], next: number): number {
	const distances = values.map((value) => Math.abs(value - next));
	return distances.indexOf(Math.min(...distances));
}

function clamp(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high);
}

/** Rounds away the float error of step math, such as `0.1 + 0.2`. */
function round(value: number, decimals: number): number {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}

/** The count of digits after the decimal point, including those an exponent implies (`1e-7` has 7). */
function decimalCount(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	const [coefficient = "", exponent = "0"] = value.toString().split("e");
	return Math.max(0, (coefficient.split(".")[1] ?? "").length - Number(exponent));
}
