import { cx } from "@ngrok/mantle/cx";
import { PreviewCanvas } from "~/components/preview-canvas";

const tones = [
	{ label: "Accent", className: "focus-visible:focus-ring" },
	{ label: "Danger", className: "focus-visible:focus-ring-danger" },
	{ label: "Warning", className: "focus-visible:focus-ring-warning" },
	{ label: "Success", className: "focus-visible:focus-ring-success" },
	{ label: "Neutral", className: "focus-visible:focus-ring-neutral" },
] as const;

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
