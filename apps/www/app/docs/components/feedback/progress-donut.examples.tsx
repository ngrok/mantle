import { ProgressDonut } from "@ngrok/mantle/progress";
import { useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

export const DynamicColorsDemo = () => {
	const [value, setValue] = useState(0);

	function computeColor() {
		if (value <= 20) {
			return "text-accent-600";
		}
		if (value <= 40) {
			return "text-success-600";
		}
		if (value <= 60) {
			return "text-warning-600";
		}
		if (value <= 80) {
			return "text-fuchsia-600";
		}
		return "text-danger-600";
	}

	return (
		<form className="space-y-4">
			<ProgressDonut.Root
				aria-label="Task progress"
				value={value}
				className="size-10"
				strokeWidth="0.375rem"
			>
				<ProgressDonut.Indicator className={computeColor()} />
			</ProgressDonut.Root>
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

/** The first example on the Progress Donut docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<ProgressDonut.Root
				aria-label="Task progress"
				value={60}
				className="size-10"
				strokeWidth="0.375rem"
			>
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>
		</PreviewCanvas>
	);
}

/** The "Indicator color" example on the Progress Donut docs page. */
export function IndicatorColorExample() {
	return (
		<PreviewCanvas>
			<ProgressDonut.Root
				aria-label="Task progress"
				value={60}
				className="size-10"
				strokeWidth="0.375rem"
			>
				<ProgressDonut.Indicator className="text-fuchsia-600" />
			</ProgressDonut.Root>
		</PreviewCanvas>
	);
}

/** The "With a label" example on the Progress Donut docs page. */
export function WithALabelExample() {
	return (
		<PreviewCanvas>
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-1.5 text-sm">
					<ProgressDonut.Root aria-label="Data transfer out" value={100} className="size-6">
						<ProgressDonut.Indicator />
					</ProgressDonut.Root>
					Data transfer out
				</div>
				<div className="flex items-center gap-1.5 text-xs">
					<div className="grid w-6 place-items-center">
						<ProgressDonut.Root
							aria-label="Included"
							value={100}
							className="size-4"
							strokeWidth="0.1875rem"
						>
							<ProgressDonut.Indicator />
						</ProgressDonut.Root>
					</div>
					Included
				</div>
				<div className="flex items-center gap-1.5 text-xs">
					<div className="grid w-6 place-items-center">
						<ProgressDonut.Root
							aria-label="Additional"
							value={25}
							className="size-4"
							strokeWidth="0.1875rem"
						>
							<ProgressDonut.Indicator />
						</ProgressDonut.Root>
					</div>
					Additional
				</div>
			</div>
		</PreviewCanvas>
	);
}

/** The "Indeterminate value" example on the Progress Donut docs page. */
export function IndeterminateValueExample() {
	return (
		<PreviewCanvas className="flex-col gap-6">
			<ProgressDonut.Root
				aria-label="Task progress"
				className="size-10"
				value="indeterminate"
				strokeWidth="0.375rem"
			>
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>
			<ProgressDonut.Root
				aria-label="Task progress"
				className="size-10"
				value="indeterminate"
				indeterminateRotationSpeed="animation-duration-[2s]"
				strokeWidth="0.375rem"
			>
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>
		</PreviewCanvas>
	);
}

/** The "Dynamic colors" example on the Progress Donut docs page. */
export function DynamicColorsExample() {
	return (
		<PreviewCanvas>
			<DynamicColorsDemo />
		</PreviewCanvas>
	);
}
