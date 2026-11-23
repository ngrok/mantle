import { cx } from "@ngrok/mantle/cx";
import { PreviewCanvas } from "~/components/preview-canvas";

const tones = [
	{ label: "Accent", className: "focus-visible:focus-ring" },
	{ label: "Danger", className: "focus-visible:focus-ring-danger" },
	{ label: "Warning", className: "focus-visible:focus-ring-warning" },
	{ label: "Success", className: "focus-visible:focus-ring-success" },
	{ label: "Neutral", className: "focus-visible:focus-ring-neutral" },
] as const;

const scrollLabels = [
	"Endpoints",
	"Domains",
	"TCP Addresses",
	"TLS Certificates",
	"Traffic Policy",
	"Agents",
] as const;

const scrollButtonClassName =
	"border-form bg-form text-strong shrink-0 cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:focus-ring";

/** The "A clipped ring" example on the Focus Ring docs page. */
export function ClippedExample() {
	return (
		<PreviewCanvas className="flex justify-center">
			<div className="flex w-72 gap-2 overflow-x-auto">
				{scrollLabels.map((label) => (
					<button key={label} type="button" className={scrollButtonClassName}>
						{label}
					</button>
				))}
			</div>
		</PreviewCanvas>
	);
}

/** The "Give the ring room" example on the Focus Ring docs page. */
export function RoomForTheRingExample() {
	return (
		<PreviewCanvas className="flex justify-center">
			<div className="-m-1 flex w-72 gap-2 overflow-x-auto p-1">
				{scrollLabels.map((label) => (
					<button key={label} type="button" className={scrollButtonClassName}>
						{label}
					</button>
				))}
			</div>
		</PreviewCanvas>
	);
}

/** The "Tones" example on the Focus Ring docs page. */
export function TonesExample() {
	return (
		<PreviewCanvas className="flex flex-wrap items-center justify-center gap-4">
			{tones.map((tone) => (
				<button
					key={tone.label}
					type="button"
					className={cx(
						"border-form bg-form text-strong cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium",
						tone.className,
					)}
				>
					{tone.label}
				</button>
			))}
		</PreviewCanvas>
	);
}
