import clsx from "clsx";
import { createContext, useContext, useId, useMemo } from "react";
import type { CSSProperties, ComponentProps, HTMLAttributes } from "react";
import { cx } from "../../utils/cx/cx.js";
import { clamp, isNumber, isValidMaxNumber, isValidValueNumber } from "./math.js";
import type { ValueType } from "./types.js";

type RemValue = `${number}rem`;
type StrokeWidth = number | RemValue;

/**
 * The default maximum value of the progress bar.
 */
const defaultMax = 100;

type ProgressContextValue = {
	max: number;
	strokeWidth: StrokeWidth;
	value: ValueType;
};

const defaultContextValue = {
	max: defaultMax,
	strokeWidth: "0.25rem",
	value: 0,
} as const satisfies ProgressContextValue;

const ProgressContext = createContext<ProgressContextValue>(defaultContextValue);

type SvgAttributes = Omit<
	HTMLAttributes<SVGElement>,
	"viewBox" | "role" | "aria-valuemax" | "aria-valuemin" | "aria-valuenow" | "width" | "height"
>;

type Props = SvgAttributes & {
	/**
	 * The maximum value of the progress bar.
	 * This attribute describes how much work the task indicated by the progress element requires.
	 * The max attribute, if present, must have a value greater than 0. The default value is 100.
	 *
	 * @default 100
	 */
	max?: number | undefined;
	/**
	 * The width of the progress bar stroke.
	 * Note, we clamp the stroke width to a minimum of 1px and max of 12px since
	 * it is proportional to the viewbox size (0 0 32 32).
	 *
	 * @default 0.25rem (4px)
	 */
	strokeWidth?: StrokeWidth;
	/**
	 * The current value of the progress bar.
	 * This attribute specifies how much of the task that has been completed.
	 * It must be a valid floating point number between 0 and max, or between 0 and 100 if max is omitted.
	 * If set to `"indeterminate"`, the progress bar is considered indeterminate.
	 *
	 * @default 0
	 */
	value?: ValueType | undefined;
	/**
	 * Controls the rotation speed of the indeterminate spinner state.
	 *
	 * Accepts a Tailwind `animation-duration-*` utility (e.g. `animation-duration-[2s]`).
	 *
	 * This prop is applied in addition to `animate-spin` to control the speed of the indeterminate spinner.
	 * @default `animation-duration-[15s]`
	 */
	indeterminateRotationSpeed?: `animation-duration-${string}`;
};

/**
 * A simple circular progress bar which shows the completion progress of a task.
 *
 * The indicator color is inherited via `currentColor`. Override the default
 * (`accent-600`) by setting the `ProgressDonut.Indicator`'s text color.
 *
 * @see https://mantle.ngrok.com/components/progress#api-progress-donut
 *
 * @example
 * ```tsx
 * <ProgressDonut.Root value={60}>
 *   <ProgressDonut.Indicator />
 * </ProgressDonut.Root>
 *
 * <ProgressDonut.Root value={60}>
 *   <ProgressDonut.Indicator color="text-danger-600" />
 * </ProgressDonut.Root>
 * ```
 */
const Root = ({
	children,
	className,
	max: _max = defaultMax,
	strokeWidth: _strokeWidth = 4,
	value: _value,
	indeterminateRotationSpeed,
	...props
}: Props) => {
	const max = isValidMaxNumber(_max) ? _max : defaultMax;
	const value = (
		isValidValueNumber(_value, max) ? _value : _value == null ? 0 : "indeterminate"
	) satisfies ValueType;
	const strokeWidthPx = deriveStrokeWidthPx(_strokeWidth ?? defaultContextValue.strokeWidth);
	const valueNow = isNumber(value) ? value : undefined;
	const radius = calcRadius(strokeWidthPx);

	const ctx: ProgressContextValue = useMemo(
		() => ({
			max,
			strokeWidth: strokeWidthPx,
			value,
		}),
		[max, strokeWidthPx, value],
	);

	return (
		<ProgressContext.Provider value={ctx}>
			{/* biome-ignore lint/a11y/useFocusableInteractive: progress bars don't need to be focusable */}
			<svg
				data-slot="progress-donut"
				aria-valuemax={max}
				aria-valuemin={0}
				aria-valuenow={valueNow}
				className={cx(
					"size-6 text-gray-200 dark:text-gray-300",
					value === "indeterminate" && [
						"animate-spin",
						// Default duration only if consumer hasn't set one.
						// Without this guard, both our `[15s]` and consumer overrides (e.g. `[2s]`)
						// end up in the DOM. Since tw-animate-css utilities aren't currently deduped by
						// tailwind-merge, whichever class Tailwind happened to emit last wins,
						// which isn't reliable.
						indeterminateRotationSpeed ?? "animation-duration-[15s]",
					],
					className,
				)}
				data-max={max}
				data-min={0}
				data-value={valueNow}
				height="100%"
				// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: this is a radial progress bar, which is possible by SVG
				role="progressbar"
				width="100%"
				{...props}
			>
				<circle
					className="[r:var(--radius)]"
					cx="50%"
					cy="50%"
					fill="transparent"
					stroke="currentColor"
					strokeWidth={strokeWidthPx}
					style={{ "--radius": radius } as CSSProperties}
				/>
				{children}
			</svg>
		</ProgressContext.Provider>
	);
};
Root.displayName = "ProgressDonut";

/**
 * Length (value) of the progress indicator tail when the progress bar is indeterminate.
 */
const indeterminateTailPercent = 0.6;

type ProgressDonutIndicatorProps = Omit<ComponentProps<"g">, "children">;

/**
 * The indicator for the circular progress bar.
 *
 * @see https://mantle.ngrok.com/components/progress#api-progress-donut-indicator
 *
 * @example
 * ```tsx
 * <ProgressDonut.Root value={60}>
 *   <ProgressDonut.Indicator />
 * </ProgressDonut.Root>
 *
 * <ProgressDonut.Root value={60}>
 *   <ProgressDonut.Indicator color="text-danger-600" />
 * </ProgressDonut.Root>
 * ```
 */
const Indicator = ({ className, ...props }: ProgressDonutIndicatorProps) => {
	const gradientId = useId();
	const ctx = useContext(ProgressContext) ?? defaultContextValue;
	const percentage =
		(ctx.value === "indeterminate" ? indeterminateTailPercent : ctx.value / ctx.max) * 100;
	const strokeWidthPx = deriveStrokeWidthPx(ctx.strokeWidth);
	const radius = calcRadius(strokeWidthPx);

	return (
		<g data-slot="progress-donut-indicator" className={cx("text-accent-600", className)} {...props}>
			{ctx.value === "indeterminate" && (
				<defs>
					<linearGradient id={gradientId}>
						<stop className="stop-opacity-100 stop-color-current" offset="0%" />
						<stop className="stop-opacity-0 stop-color-current" offset="95%" />
					</linearGradient>
				</defs>
			)}
			<circle
				className={clsx(
					"[r:var(--radius)]", // set the circle radius to be the value of the calc'd CSS variable set on the style
					"origin-center",
				)}
				cx="50%"
				cy="50%"
				fill="transparent"
				pathLength={100}
				stroke={ctx.value === "indeterminate" ? `url(#${gradientId})` : "currentColor"}
				strokeDasharray={100}
				strokeDashoffset={100 - percentage}
				strokeLinecap="round"
				strokeWidth={strokeWidthPx}
				style={{ "--radius": radius } as CSSProperties}
				transform="rotate(-90)" // rotate -90 degrees so it starts from the top
			/>
		</g>
	);
};
Indicator.displayName = "ProgressDonutIndicator";

/**
 * A simple circular progress bar which shows the completion progress of a task.
 *
 * The indicator color is inherited via `currentColor`. Override the default
 * (`accent-600`) by setting the `ProgressDonut.Indicator`'s text color.
 *
 * @see https://mantle.ngrok.com/components/progress
 *
 * @example
 * Composition:
 * ```
 * ProgressDonut.Root
 * └── ProgressDonut.Indicator
 * ```
 *
 * @example
 * ```tsx
 * <ProgressDonut.Root value={60}>
 *   <ProgressDonut.Indicator />
 * </ProgressDonut.Root>
 *
 * <ProgressDonut.Root value={60}>
 *   <ProgressDonut.Indicator color="text-danger-600" />
 * </ProgressDonut.Root>
 * ```
 */
const ProgressDonut = {
	/**
	 * A simple circular progress bar which shows the completion progress of a task.
	 *
	 * The indicator color is inherited via `currentColor`. Override the default
	 * (`accent-600`) by setting the `ProgressDonut.Indicator`'s text color.
	 *
	 * @see https://mantle.ngrok.com/components/progress#api-progress-donut-root
	 *
	 * @example
	 * ```tsx
	 * <ProgressDonut.Root value={60}>
	 *   <ProgressDonut.Indicator />
	 * </ProgressDonut.Root>
	 *
	 * <ProgressDonut.Root value={60}>
	 *   <ProgressDonut.Indicator color="text-danger-600" />
	 * </ProgressDonut.Root>
	 * ```
	 */
	Root,
	/**
	 * The indicator for the circular progress bar.
	 *
	 * @see https://mantle.ngrok.com/components/progress#api-progress-donut-indicator
	 *
	 * @example
	 * ```tsx
	 * <ProgressDonut.Root value={60}>
	 *   <ProgressDonut.Indicator />
	 * </ProgressDonut.Root>
	 *
	 * <ProgressDonut.Root value={60}>
	 *   <ProgressDonut.Indicator color="text-danger-600" />
	 * </ProgressDonut.Root>
	 * ```
	 */
	Indicator,
} as const;

export {
	//,
	ProgressDonut,
};

/**
 * Derive the stroke width in pixels as a number value or pixels/rem from a string value.
 * Note, this function clamps the stroke width to a minimum of 1 and max of 12 since
 * it is proportional to the viewbox size (0 0 32 32).
 *
 * @example
 * ```tsx
 * const strokeWidth1 = deriveStrokeWidthPx(8);
 * // Returns: 8
 *
 * const strokeWidth2 = deriveStrokeWidthPx("0.5rem");
 * // Returns: 8 (0.5 * 16)
 *
 * const strokeWidth3 = deriveStrokeWidthPx(20);
 * // Returns: 12 (clamped to maximum)
 * ```
 */
export function deriveStrokeWidthPx(strokeWidth: number | string | undefined | null): number {
	let value = 4;
	if (strokeWidth == null) {
		return value;
	}

	if (typeof strokeWidth === "number") {
		value = strokeWidth;
	} else if (strokeWidth.endsWith("rem")) {
		value = Number(strokeWidth.replace("rem", "")) * 16;
	} else {
		value = Number(strokeWidth);
	}

	const stroke = Number.isNaN(value) ? 4 : value;
	return clamp(stroke, { min: 1, max: 12 });
}

/**
 * Calculate the radius of the progress donut and indicator based on the stroke
 * width in pixels.
 */
function calcRadius(strokeWidthPx: number) {
	return `calc(50% - ${strokeWidthPx / 2}px)` as const;
}
