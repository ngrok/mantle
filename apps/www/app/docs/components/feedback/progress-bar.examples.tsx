import { ProgressBar } from "@ngrok/mantle/progress";
import { useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

export const DynamicColorsDemo = () => {
	const [value, setValue] = useState(0);

	function computeIndicatorColor() {
		if (value <= 20) {
			return "bg-danger-600";
		}
		if (value <= 40) {
			return "bg-warning-600";
		}
		if (value <= 60) {
			return "bg-accent-600";
		}
		if (value <= 80) {
			return "bg-success-600";
		}
		return "bg-fuchsia-600";
	}

	return (
		<form className="space-y-4">
			<ProgressBar.Root aria-label="Task progress" value={value}>
				<ProgressBar.Indicator className={computeIndicatorColor()} />
			</ProgressBar.Root>
			<label className="block space-y-1">
				<p>Value: {value}%</p>
				<input
					type="range"
					min={0}
					max={100}
					value={value}
					onChange={(event) => setValue(Number(event.target.value))}
				/>
			</label>
		</form>
	);
};

/** The first example on the Progress Bar docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<ProgressBar.Root aria-label="Task progress" value={60}>
				<ProgressBar.Indicator />
			</ProgressBar.Root>
		</PreviewCanvas>
	);
}

/** The "Indicator color" example on the Progress Bar docs page. */
export function IndicatorColorExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<ProgressBar.Root aria-label="Task progress" value={60}>
				<ProgressBar.Indicator className="bg-warning-600" />
			</ProgressBar.Root>
			<ProgressBar.Root aria-label="Task progress" value={30}>
				<ProgressBar.Indicator className="bg-accent-600" />
			</ProgressBar.Root>
			<ProgressBar.Root aria-label="Task progress" value={85}>
				<ProgressBar.Indicator className="bg-emerald-600" />
			</ProgressBar.Root>
		</PreviewCanvas>
	);
}

/** The "With a label" example on the Progress Bar docs page. */
export function WithALabelExample() {
	return (
		<PreviewCanvas>
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-3 text-sm">
					<ProgressBar.Root aria-label="Complete" value={100} className="w-24">
						<ProgressBar.Indicator className="bg-success-600" />
					</ProgressBar.Root>
					Complete
				</div>
				<div className="flex items-center gap-3 text-sm">
					<ProgressBar.Root aria-label="In progress" value={45} className="w-24">
						<ProgressBar.Indicator className="bg-warning-600" />
					</ProgressBar.Root>
					In Progress
				</div>
				<div className="flex items-center gap-3 text-sm">
					<ProgressBar.Root aria-label="Starting" value={10} className="w-24">
						<ProgressBar.Indicator className="bg-danger-600" />
					</ProgressBar.Root>
					Starting
				</div>
			</div>
		</PreviewCanvas>
	);
}

/** The "Custom maximum value" example on the Progress Bar docs page. */
export function CustomMaximumValueExample() {
	return (
		<PreviewCanvas>
			<ProgressBar.Root aria-label="Task progress" value={150} max={200}>
				<ProgressBar.Indicator className="bg-purple-600" />
			</ProgressBar.Root>
		</PreviewCanvas>
	);
}

/** The "Indeterminate value" example on the Progress Bar docs page. */
export function IndeterminateValueExample() {
	return (
		<PreviewCanvas>
			<ProgressBar.Root aria-label="Task progress" value="indeterminate">
				<ProgressBar.Indicator className="bg-accent-600" />
			</ProgressBar.Root>
		</PreviewCanvas>
	);
}

/** The "Dynamic colors" example on the Progress Bar docs page. */
export function DynamicColorsExample() {
	return (
		<PreviewCanvas>
			<DynamicColorsDemo />
		</PreviewCanvas>
	);
}
