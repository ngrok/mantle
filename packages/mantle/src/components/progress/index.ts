/**
 * Re-exports for the Progress component family.
 *
 * @see https://mantle.ngrok.com/components/feedback/progress-bar
 * @see https://mantle.ngrok.com/components/feedback/progress-donut
 */

import * as ProgressBarParts from "./progress-bar-parts.js";
import * as ProgressDonutParts from "./progress-donut-parts.js";

/**
 * A simple circular progress bar which shows the completion progress of a task.
 *
 * The indicator color is inherited via `currentColor`. Override the default
 * (`accent-600`) by setting the `ProgressDonut.Indicator`'s text color.
 *
 * @useWhen Show how much of a task or a quota is complete, as a small circle.
 *
 * @siblings
 * - `ProgressBar`: the indicator is a horizontal bar.
 *
 * @see https://mantle.ngrok.com/components/feedback/progress-donut
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
 * <ProgressDonut.Root aria-label="Data transfer out" value={60}>
 *   <ProgressDonut.Indicator />
 * </ProgressDonut.Root>
 *
 * <ProgressDonut.Root aria-label="Data transfer out" value={60}>
 *   <ProgressDonut.Indicator className="text-danger-600" />
 * </ProgressDonut.Root>
 * ```
 */
const ProgressDonut = ProgressDonutParts;

export {
	//,
	ProgressDonut,
};

/**
 * Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.
 *
 * A horizontal progress bar that shows the completion progress of a task.
 * Use this component for linear progress indication.
 *
 * @useWhen Show how much of a task or a quota is complete, as a horizontal bar.
 *
 * @siblings
 * - `ProgressDonut`: the indicator must be a small circle.
 * - `Skeleton`: the content still loads, and its progress is unknown.
 *
 * @see https://mantle.ngrok.com/components/feedback/progress-bar
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
const ProgressBar = ProgressBarParts;

export {
	//,
	ProgressBar,
};
