"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";

import { type ComponentProps, createContext, useContext, useMemo } from "react";
import { cx } from "../../utils/cx/cx.js";
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
	 * This attribute specifies how much of the task that has been completed.
	 * It must be a valid floating point number between 0 and max, or between 0 and 100 if max is omitted.
	 * If set to `"indeterminate"`, the progress bar is considered indeterminate. (for now there is no visual difference than 0)
	 *
	 * @default 0
	 */
	value?: ValueType | undefined;
};

/**
 * Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
 *
 * A horizontal progress bar that shows the completion progress of a task.
 * Use this component for linear progress indication.
 *
 * @see https://mantle.ngrok.com/components/progress#api-progress-bar
 *
 * @example
 * ```tsx
 * <ProgressBar.Root value={60}>
 *   <ProgressBar.Indicator />
 * </ProgressBar.Root>
 *
 * <ProgressBar.Root value={75} max={100}>
 *   <ProgressBar.Indicator />
 * </ProgressBar.Root>
 *
 * // Indeterminate progress
 * <ProgressBar.Root value="indeterminate">
 *   <ProgressBar.Indicator />
 * </ProgressBar.Root>
 * ```
 */
function Root({ className, children, max: _max = defaultMax, value: _value, ...props }: RootProps) {
	const max = isValidMaxNumber(_max) ? _max : defaultMax;
	const value = (
		isValidValueNumber(_value, max) ? _value : _value == null ? 0 : "indeterminate"
	) satisfies ValueType;

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
			<ProgressPrimitive.Root
				data-slot="progress-bar"
				className={cx(
					"bg-base-hover dark:bg-base shadow-inner relative h-3 w-full overflow-hidden rounded-md",
					className,
				)}
				value={valueNow}
				max={max}
				{...props}
			>
				{children}
			</ProgressPrimitive.Root>
		</ProgressContext.Provider>
	);
}
Root.displayName = "Root";

type IndicatorProps = ComponentProps<typeof ProgressPrimitive.Indicator>;

/**
 * Displays the progress indicator, which visually represents the completion progress of a task.
 *
 * The visual indicator that shows the actual progress within the progress bar.
 * This component should be used inside a ProgressBar.Root component.
 *
 * @see https://mantle.ngrok.com/components/progress#api-progress-bar-indicator
 *
 * @example
 * ```tsx
 * <ProgressBar.Root value={60}>
 *   <ProgressBar.Indicator />
 * </ProgressBar.Root>
 *
 * // Custom styled indicator
 * <ProgressBar.Root value={60}>
 *   <ProgressBar.Indicator className="bg-success-600" />
 * </ProgressBar.Root>
 * ```
 */
function Indicator({ className, style, ...props }: IndicatorProps) {
	const ctx = useContext(ProgressContext);
	const { max } = ctx;
	const value = ctx.value === "indeterminate" ? 0 : ctx.value;
	const translatePercent = ((max - value) / max) * 100;

	return (
		<ProgressPrimitive.Indicator
			data-slot="progress-bar-indicator"
			className={cx("bg-accent-600 h-full w-full flex-1 transition-all", className)}
			style={{ ...style, transform: `translateX(-${translatePercent}%)` }}
			{...props}
		/>
	);
}
Indicator.displayName = "Indicator";

/**
 * Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
 *
 * A horizontal progress bar that shows the completion progress of a task.
 * Use this component for linear progress indication.
 *
 * @see https://mantle.ngrok.com/components/progress
 *
 * @example
 * Composition:
 * ```
 * ProgressBar.Root
 * └── ProgressBar.Indicator
 * ```
 *
 * @example
 * ```tsx
 * <ProgressBar.Root value={60}>
 *   <ProgressBar.Indicator />
 * </ProgressBar.Root>
 *
 * <ProgressBar.Root value={75} max={100}>
 *   <ProgressBar.Indicator />
 * </ProgressBar.Root>
 *
 * // Indeterminate progress
 * <ProgressBar.Root value="indeterminate">
 *   <ProgressBar.Indicator />
 * </ProgressBar.Root>
 * ```
 */
const ProgressBar = {
	/**
	 * Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
	 *
	 * A horizontal progress bar that shows the completion progress of a task.
	 * Use this component for linear progress indication.
	 *
	 * @see https://mantle.ngrok.com/components/progress#api-progress-bar
	 *
	 * @example
	 * ```tsx
	 * <ProgressBar.Root value={60}>
	 *   <ProgressBar.Indicator />
	 * </ProgressBar.Root>
	 *
	 * <ProgressBar.Root value={75} max={100}>
	 *   <ProgressBar.Indicator />
	 * </ProgressBar.Root>
	 *
	 * // Indeterminate progress
	 * <ProgressBar.Root value="indeterminate">
	 *   <ProgressBar.Indicator />
	 * </ProgressBar.Root>
	 * ```
	 */
	Root,
	/**
	 * Displays the progress indicator, which visually represents the completion progress of a task.
	 *
	 * The visual indicator that shows the actual progress within the progress bar.
	 * This component should be used inside a ProgressBar.Root component.
	 *
	 * @see https://mantle.ngrok.com/components/progress#api-progress-bar-indicator
	 *
	 * @example
	 * ```tsx
	 * <ProgressBar.Root value={60}>
	 *   <ProgressBar.Indicator />
	 * </ProgressBar.Root>
	 *
	 * // Custom styled indicator
	 * <ProgressBar.Root value={60}>
	 *   <ProgressBar.Indicator className="bg-success-600" />
	 * </ProgressBar.Root>
	 * ```
	 */
	Indicator,
} as const;

export {
	//,
	ProgressBar,
};
