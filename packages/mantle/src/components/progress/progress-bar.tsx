"use client";

import { type ComponentProps, createContext, useContext, useMemo } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";
import { isNumber, isValidMaxNumber, isValidValueNumber } from "./math.js";
import type { ValueType } from "./types.js";

/**
 * The default maximum value of the progress bar.
 */
const defaultMax = 100;

type ProgressContextValue = {
	max: number;
	value: ValueType;
};

const defaultContextValue = {
	max: defaultMax,
	value: 0,
} as const satisfies ProgressContextValue;

const ProgressContext = createContext<ProgressContextValue>(defaultContextValue);

type RootProps = ComponentProps<"div"> & {
	/**
	 * The maximum value of the progress bar.
	 * This attribute describes how much work the task indicated by the progress element requires.
	 * The max attribute, if present, must have a value greater than 0. The default value is 100.
	 *
	 * @default 100
	 */
	max?: number | undefined;
	/**
	 * The current value of the progress bar.
	 * This attribute specifies how much of the task is complete.
	 * It must be a valid floating point number between 0 and `max`, or, when `max` is omitted, between 0 and 100.
	 * If set to `"indeterminate"`, the progress bar is considered indeterminate. (for now there is no visual difference than 0)
	 * A value outside `0..max` also renders as indeterminate.
	 *
	 * @default 0
	 */
	value?: ValueType | undefined;
} & WithDataSlot;

/** The `data-state` of a bar and its indicator. */
function progressState(valueNow: number | undefined, max: number) {
	if (valueNow == null) {
		return "indeterminate";
	}
	return valueNow === max ? "complete" : "loading";
}

/** Resolves the `value` prop: a number in [0, `max`] stays, a nullish value is 0, and anything else is indeterminate. */
function resolveValue(value: ValueType | undefined, max: number): ValueType {
	if (isValidValueNumber(value, max)) {
		return value;
	}
	return value == null ? 0 : "indeterminate";
}

/**
 * Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
 *
 * A horizontal progress bar that shows the completion progress of a task.
 * Use this component for linear progress indication.
 *
 * **Accessibility.** Renders `role="progressbar"` with `aria-valuemin`,
 * `aria-valuemax`, and `aria-valuenow` (omitted while indeterminate). The role
 * needs a name: pass `aria-label`, or `aria-labelledby` that points at a visible
 * label.
 *
 * | Data Attribute | Value                                                  | Description                                  |
 * | -------------- | ------------------------------------------------------ | -------------------------------------------- |
 * | `data-slot`    | `"progress-bar"`                                       | The root element.                            |
 * | `data-state`   | `"complete"` \| `"indeterminate"` \| `"loading"`       | Set from `value` and `max`.                  |
 * | `data-value`   | the current value                                      | Absent while indeterminate.                  |
 * | `data-max`     | the maximum                                            |                                              |
 *
 * @see https://mantle.ngrok.com/components/feedback/progress-bar#progressbarroot
 *
 * @example
 * ```tsx
 * <ProgressBar.Root aria-label="Upload progress" value={60}>
 *   <ProgressBar.Indicator />
 * </ProgressBar.Root>
 *
 * <ProgressBar.Root aria-label="Upload progress" value={75} max={100}>
 *   <ProgressBar.Indicator />
 * </ProgressBar.Root>
 *
 * // Indeterminate progress
 * <ProgressBar.Root aria-label="Upload progress" value="indeterminate">
 *   <ProgressBar.Indicator />
 * </ProgressBar.Root>
 * ```
 */
function Root({
	"data-slot": dataSlot,
	className,
	children,
	max: _max = defaultMax,
	value: _value,
	...props
}: RootProps) {
	const max = isValidMaxNumber(_max) ? _max : defaultMax;
	const value = resolveValue(_value, max);

	const valueNow = isNumber(value) ? value : undefined;

	const ctx: ProgressContextValue = useMemo(
		() => ({
			max,
			value,
		}),
		[max, value],
	);

	return (
		<ProgressContext.Provider value={ctx}>
			<div
				role="progressbar"
				aria-valuemax={max}
				aria-valuemin={0}
				aria-valuenow={valueNow}
				aria-valuetext={valueNow == null ? undefined : `${Math.round((valueNow / max) * 100)}%`}
				data-state={progressState(valueNow, max)}
				data-value={valueNow}
				data-max={max}
				data-slot={joinDataSlot(dataSlot, "progress-bar")}
				className={cx(
					"bg-base-hover dark:bg-base shadow-inner relative h-3 w-full overflow-hidden rounded-md",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</ProgressContext.Provider>
	);
}
type IndicatorProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * Displays the progress indicator, which visually represents the completion progress of a task.
 *
 * The visual indicator that shows the actual progress within the progress bar.
 * This component should be used inside a ProgressBar.Root component.
 *
 * @see https://mantle.ngrok.com/components/feedback/progress-bar#progressbarindicator
 *
 * @example
 * ```tsx
 * <ProgressBar.Root aria-label="Upload progress" value={60}>
 *   <ProgressBar.Indicator />
 * </ProgressBar.Root>
 *
 * // Custom styled indicator
 * <ProgressBar.Root aria-label="Upload progress" value={60}>
 *   <ProgressBar.Indicator className="bg-success-600" />
 * </ProgressBar.Root>
 * ```
 */
function Indicator({
	asChild = false,
	"data-slot": dataSlot,
	className,
	style,
	...props
}: IndicatorProps) {
	const ctx = useContext(ProgressContext);
	const { max } = ctx;
	const valueNow = isNumber(ctx.value) ? ctx.value : undefined;
	const translatePercent = ((max - (valueNow ?? 0)) / max) * 100;
	const Component = asChild ? Slot : "div";

	return (
		<Component
			data-state={progressState(valueNow, max)}
			data-value={valueNow}
			data-max={max}
			data-slot={joinDataSlot(dataSlot, "progress-bar-indicator")}
			className={cx(
				"bg-accent-600 h-full w-full flex-1 transition-transform duration-200 ease-out-strong motion-reduce:transition-none",
				className,
			)}
			style={{ ...style, transform: `translateX(-${translatePercent}%)` }}
			{...props}
		/>
	);
}
export {
	//,
	Root,
	Indicator,
};
