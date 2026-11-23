import type { KeyboardEvent, PointerEvent } from "react";

type SliderBehaviorOptions = {
	/** Whether the parent owns the values. When `false`, the DOM holds them. */
	controlled: boolean;
	min: number;
	max: number;
	step: number;
	/** The fewest steps that must stay between two thumbs. */
	minStepsBetweenThumbs: number;
	/** Whether a thumb stops at its neighbor instead of passing it. */
	preserveThumbOrder: boolean;
	orientation: "horizontal" | "vertical";
	inverted: boolean;
	/** The text direction. When omitted, the root's computed `direction` decides. */
	dir: "ltr" | "rtl" | undefined;
	onValueChange: ((value: number[]) => void) | undefined;
	/** Called once for each keyboard step, and at the end of a drag that changed a value. */
	onValueCommit: ((value: number[]) => void) | undefined;
	/** The text of a value, for `aria-valuetext`. */
	formatValue: ((value: number) => string) | undefined;
};

/**
 * The CSS custom property that holds a thumb's value, on the thumb. CSS places
 * the thumb from it, and an uncontrolled slider keeps its state in it.
 */
const VALUE_PROPERTY = "--_value";

/** The CSS custom properties that hold the values at the ends of the range, on the range. */
const RANGE_START_PROPERTY = "--_start";
const RANGE_END_PROPERTY = "--_end";

/**
 * The behavior of a slider with one or more thumbs, after the
 * [WAI-ARIA APG slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/).
 * Each thumb is a native `<input type="range">`, which owns the role, the value
 * that assistive technology reads and sets, focus, `disabled`, and the form
 * value. These handlers add only what the native input cannot do:
 *
 * - A press on the track moves the nearest thumb to the pointer. A press on a
 *   thumb grabs it where it is. A drag then follows the pointer.
 * - The keys follow `orientation`, `inverted`, and the text direction. Shift with
 *   an arrow key and PageUp or PageDown move 10 steps. Home and End move the
 *   focused thumb as far as its neighbors allow.
 * - Thumbs keep `minStepsBetweenThumbs` between them. A thumb that passes
 *   another swaps places with it and keeps focus, unless `preserveThumbOrder`.
 * - A form reset returns an uncontrolled slider to its default values.
 *
 * The handlers keep no React state. They read the values from the
 * `--_value` property of each `[data-slot="slider-thumb"]` element, so an
 * uncontrolled slider changes the DOM and renders nothing during a drag.
 *
 * @example
 * ```tsx
 * const { rootProps, inputProps } = sliderBehavior({ controlled: false, min: 0, max: 100, ... });
 * <span {...rootProps}>
 *   <span data-slot="slider-track"><span data-slot="slider-range" /></span>
 *   <span data-slot="slider-thumb" style={{ "--_value": 50 }}>
 *     <input type="range" {...inputProps} />
 *   </span>
 * </span>
 * ```
 */
function sliderBehavior({
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
}: SliderBehaviorOptions) {
	const edgeOfMin = (root: HTMLElement): Edge => {
		if (orientation === "vertical") {
			return inverted ? "top" : "bottom";
		}
		const rtl = (dir ?? getComputedStyle(root).direction) === "rtl";
		return rtl === inverted ? "left" : "right";
	};

	/** Applies `next` to the thumb at `index`, focuses the thumb it lands on, and returns that index. */
	const update = ({
		root,
		next,
		index,
		commit,
		keyboard,
	}: {
		root: HTMLElement;
		next: number;
		index: number;
		commit: boolean;
		keyboard: boolean;
	}): number => {
		const parts = partsOf(root);
		const current = parts.values;
		const result = nextValues({
			values: current,
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
		// Why after the check: only a press on the track glides, and a move that changes no value
		// must not stop the thumb's glide while the range's runs on.
		root.removeAttribute(TRACK_PRESS);
		parts.inputs[result.index]?.focus({ preventScroll: true, focusVisible: keyboard });
		if (!controlled) {
			paint(parts, result.values, { min, formatValue });
		}
		announce({ inputs: parts.inputs, before: current, after: result.values, grid: { min, step } });
		onValueChange?.(result.values);
		if (commit) {
			onValueCommit?.(result.values);
		}
		return result.index;
	};

	const rootProps = {
		onPointerDown: (event: PointerEvent<HTMLSpanElement>) => {
			const root = event.currentTarget;
			const target = event.target;
			const { inputs, values } = partsOf(root);
			if (slides.has(root)) {
				// Why: a second pointer does not take over the drag of the first.
				return;
			}
			// Why `:disabled`: a disabled `<fieldset>` disables the inputs but not the slider prop.
			if (
				event.button !== 0 ||
				!(target instanceof Element) ||
				inputs[0]?.matches(":disabled") !== false
			) {
				return;
			}
			target.setPointerCapture(event.pointerId);
			// Why: a press neither selects text nor moves focus to the root.
			event.preventDefault();
			const edge = edgeOfMin(root);
			const rect = root.getBoundingClientRect();
			const pressed = valueAtPoint({ event, rect, edge, min, max });
			// Why the input too: it covers its thumb and takes the press, as a native range input does.
			const thumbIndex = inputs.findIndex(
				(input) => input === target || input.parentElement === target,
			);
			const thumbValue = values[thumbIndex];
			if (thumbValue != null) {
				// Why the offset: a press on a thumb grabs it where it is, so the thumb
				// does not jump to the pointer on the first move.
				inputs[thumbIndex]?.focus({ preventScroll: true, focusVisible: false });
				root.setAttribute(DRAGGING, "");
				slides.set(root, {
					pointerId: event.pointerId,
					index: thumbIndex,
					rect,
					before: values,
					edge,
					// Why no offset during a glide: the thumb shows short of its value, under the pointer.
					offset: root.hasAttribute(TRACK_PRESS) ? 0 : pressed - thumbValue,
				});
				return;
			}
			const index = update({
				root,
				next: pressed,
				index: closestIndex(values, pressed),
				commit: false,
				keyboard: false,
			});
			glide(root);
			root.setAttribute(DRAGGING, "");
			slides.set(root, {
				pointerId: event.pointerId,
				index,
				rect,
				before: values,
				edge,
				offset: 0,
			});
		},
		onPointerMove: (event: PointerEvent<HTMLSpanElement>) => {
			const root = event.currentTarget;
			const slide = slides.get(root);
			const target = event.target;
			// Why the pointer id: a second touch has its own implicit capture.
			if (
				slide?.pointerId !== event.pointerId ||
				!(target instanceof Element) ||
				!target.hasPointerCapture(event.pointerId)
			) {
				return;
			}
			const next =
				valueAtPoint({ event, rect: slide.rect, edge: slide.edge, min, max }) - slide.offset;
			slide.index = update({ root, next, index: slide.index, commit: false, keyboard: false });
		},
		// Why the lost capture: it ends a drag after a pointer up and after a cancel.
		onLostPointerCapture: (event: PointerEvent<HTMLSpanElement>) => {
			const root = event.currentTarget;
			const slide = slides.get(root);
			if (slide?.pointerId !== event.pointerId) {
				return;
			}
			slides.delete(root);
			root.removeAttribute(DRAGGING);
			const { values } = partsOf(root);
			if (String(values) !== String(slide.before)) {
				onValueCommit?.(values);
			}
		},
		onKeyDown: (event: KeyboardEvent<HTMLSpanElement>) => {
			const root = event.currentTarget;
			const { inputs, values } = partsOf(root);
			const index = inputs.findIndex((input) => input === event.target);
			const current = values[index];
			if (current == null) {
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
			update({ root, next, index, commit: true, keyboard: true });
		},
	};

	const inputProps = {
		// Why: assistive technology sets the value of a native range input directly.
		onChange: (event: { currentTarget: HTMLInputElement }) => {
			const input = event.currentTarget;
			const root = input.parentElement?.parentElement;
			if (announcing || root == null) {
				return;
			}
			const { inputs, values } = partsOf(root);
			if (resetting) {
				const next = inputs.map((each) => each.valueAsNumber);
				root.removeAttribute(TRACK_PRESS);
				for (const [index, each] of inputs.entries()) {
					each.step = onStepGrid(next[index] ?? min, { min, step }) ? String(step) : "any";
				}
				if (String(next) !== String(values)) {
					paint(partsOf(root), next, { min, formatValue });
					onValueChange?.(next);
				}
				return;
			}
			const index = inputs.indexOf(input);
			update({ root, next: input.valueAsNumber, index, commit: true, keyboard: true });
			// Why: a value the thumbs reject leaves an uncontrolled input where it was.
			// React puts a controlled input back by itself.
			if (!controlled && String(partsOf(root).values) === String(values)) {
				input.value = String(values[index]);
			}
		},
	};

	return { rootProps, inputProps };
}

/**
 * The ref callback for the slider root. A form reset puts each input of an
 * uncontrolled slider back to its default; the thumbs and `onValueChange`
 * follow through each input's own `onChange`. It also stops native touch
 * handling on the inputs.
 *
 * @example
 * ```tsx
 * <span ref={useComposedRefs(ref, sliderRootRef)} />
 * ```
 */
function sliderRootRef(root: HTMLSpanElement | null) {
	if (root == null) {
		return;
	}
	root.addEventListener("touchstart", stopNativeTouch, { passive: false });
	const form = root.querySelector("input")?.form;
	const followReset = () => {
		// Why "any": a step written for a later value would snap an off-grid default.
		for (const input of partsOf(root).inputs) {
			input.step = "any";
		}
		// Why a task: the form resets its inputs after the `reset` event, and a
		// microtask runs first when the reset comes from a click.
		setTimeout(() => {
			resetting = true;
			try {
				for (const input of partsOf(root).inputs) {
					input.dispatchEvent(new Event("input", { bubbles: true }));
				}
			} finally {
				resetting = false;
			}
		});
	};
	form?.addEventListener("reset", followReset);
	return () => {
		root.removeEventListener("touchstart", stopNativeTouch);
		form?.removeEventListener("reset", followReset);
	};
}

/**
 * Stops a range input from sliding itself under a finger, from its own small box.
 * The root's `touch-none` already stops scrolling, so this non-passive listener costs no scroll.
 */
function stopNativeTouch(event: TouchEvent) {
	if (event.target instanceof HTMLInputElement) {
		event.preventDefault();
	}
}

/** The root attribute that shows the value labels while a pointer drags a thumb. */
const DRAGGING = "data-dragging";

/** The root attribute that lets the thumbs and the range glide to the value of a press on the track. */
const TRACK_PRESS = "data-track-press";

/** The timer that ends the glide on each root. */
const glides = new WeakMap<Element, ReturnType<typeof setTimeout>>();

/**
 * Lets the thumbs and the range of `root` glide to their new values. The
 * attribute goes 250ms later, after `duration-200` and a busy frame, so a later
 * change of a controlled value or a form reset moves at once. Why a timer: an
 * interrupted transition fires no `transitionend`.
 */
function glide(root: Element) {
	root.setAttribute(TRACK_PRESS, "");
	clearTimeout(glides.get(root));
	glides.set(
		root,
		setTimeout(() => root.removeAttribute(TRACK_PRESS), 250),
	);
}

/** Whether `value` sits on the grid of `step`s that starts at `min`. */
function onStepGrid(value: number, { min, step }: { min: number; step: number }): boolean {
	const steps = (value - min) / step;
	return Math.abs(steps - Math.round(steps)) < 1e-9;
}

/**
 * The CSS custom properties that place a thumb and the range for `values`.
 * The thumb takes `--_value`. The range takes its ends: the start of the
 * track and the only value, or the lowest and the highest value.
 *
 * @example
 * ```ts
 * sliderStyles([20, 70], 0); // { range: { "--_start": 20, "--_end": 70 }, thumbs: [{ "--_value": 20 }, { "--_value": 70 }] }
 * ```
 */
function sliderStyles(values: number[], min: number) {
	return {
		range: {
			[RANGE_START_PROPERTY]: values.length > 1 ? Math.min(...values) : min,
			[RANGE_END_PROPERTY]: Math.max(...values),
		},
		thumbs: values.map((value) => ({ [VALUE_PROPERTY]: value })),
	};
}

export {
	//,
	onStepGrid,
	sliderBehavior,
	sliderRootRef,
	sliderStyles,
};

// MARK: - Private

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

/** The edge of the track where `min` sits. */
type Edge = keyof typeof BACK_KEYS;

/** The drag in progress on a root: its pointer, the thumb, the root's box, the values at the start, and the grab offset in value units. */
type Slide = {
	pointerId: number;
	index: number;
	rect: DOMRect;
	before: number[];
	edge: Edge;
	offset: number;
};

/** The drag in progress on each slider root. A root holds no drag between a pointer up and the next pointer down. */
const slides = new WeakMap<Element, Slide>();

/** Whether the slider is sending its own `input` events, which its inputs must not read as a change. */
let announcing = false;

/** Whether the slider is sending `input` events after a form reset, so its inputs paint the reset values. */
let resetting = false;

type Parts = {
	range: HTMLElement | null;
	thumbs: HTMLElement[];
	inputs: HTMLInputElement[];
	values: number[];
};

/** The range, the thumbs, their inputs, and the values that the thumbs hold, in track order. */
function partsOf(root: Element): Parts {
	const thumbs = [...root.children].filter(
		(child): child is HTMLElement =>
			child instanceof HTMLElement && child.dataset.slot === "slider-thumb",
	);
	const inputs = thumbs.flatMap((thumb) =>
		thumb.firstElementChild instanceof HTMLInputElement ? [thumb.firstElementChild] : [],
	);
	return {
		range: root.querySelector<HTMLElement>("[data-slot='slider-range']"),
		thumbs,
		inputs,
		values: thumbs.map((thumb) => Number(thumb.style.getPropertyValue(VALUE_PROPERTY))),
	};
}

/**
 * Writes `values` to the thumbs and the range of an uncontrolled slider, and the
 * value text to its inputs. {@link announce} writes the input values.
 */
function paint(
	{ range, thumbs, inputs }: Parts,
	values: number[],
	{ min, formatValue }: { min: number; formatValue: ((value: number) => string) | undefined },
): void {
	const styles = sliderStyles(values, min);
	for (const [index, thumb] of thumbs.entries()) {
		const value = values[index] ?? min;
		thumb.style.setProperty(VALUE_PROPERTY, String(value));
		if (formatValue != null) {
			inputs[index]?.setAttribute("aria-valuetext", formatValue(value));
		}
	}
	range?.style.setProperty(RANGE_START_PROPERTY, String(styles.range[RANGE_START_PROPERTY]));
	range?.style.setProperty(RANGE_END_PROPERTY, String(styles.range[RANGE_END_PROPERTY]));
}

/**
 * Writes each input whose value changed and sends a bubbling `input` event from
 * it, so a form or an ancestor `onChange` sees a change that the slider made.
 */
function announce({
	inputs,
	before,
	after,
	grid,
}: {
	inputs: HTMLInputElement[];
	before: number[];
	after: number[];
	grid: { min: number; step: number };
}): void {
	announcing = true;
	try {
		for (const [index, input] of inputs.entries()) {
			const value = after[index];
			if (value == null || value === before[index]) {
				continue;
			}
			// Why before the value: the browser snaps a value to `step`, and `max` can sit off the grid.
			input.step = onStepGrid(value, grid) ? String(grid.step) : "any";
			// Why the prototype's setter: it skips React's value tracker, so React reads
			// the event as a change of a controlled input.
			Reflect.set(HTMLInputElement.prototype, "value", String(value), input);
			input.dispatchEvent(new Event("input", { bubbles: true }));
		}
	} finally {
		announcing = false;
	}
}

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
	const decimals = Math.max(decimalCount(step), decimalCount(min));
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
	const decimals = Math.max(decimalCount(step), decimalCount(min));
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
