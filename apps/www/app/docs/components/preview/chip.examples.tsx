import { Chip } from "@ngrok/mantle/chip";
import { Tooltip } from "@ngrok/mantle/tooltip";
import { useState } from "react";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Chip docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="gap-2">
			<Chip>Read</Chip>
			<Chip defaultPressed>Write</Chip>
			<Chip>Manage</Chip>
		</PreviewCanvas>
	);
}

/** A chip whose pressed state belongs to the page. */
export function ControlledExample() {
	const [pressed, setPressed] = useState(false);
	return (
		<PreviewCanvas>
			<Chip pressed={pressed} onPressedChange={setPressed}>
				Write
			</Chip>
		</PreviewCanvas>
	);
}

/** The two Chip sizes. */
export function SizeExample() {
	return (
		<PreviewCanvas className="gap-3">
			<Chip size="xs" defaultPressed>
				Read
			</Chip>
			<Chip size="sm" defaultPressed>
				Read
			</Chip>
		</PreviewCanvas>
	);
}

/** Disabled chips keep their state visible. */
export function DisabledExample() {
	return (
		<PreviewCanvas className="gap-2">
			<Chip disabled>Write</Chip>
			<Chip disabled defaultPressed>
				Read
			</Chip>
		</PreviewCanvas>
	);
}

/** A named group of independently selected access levels. */
export function ScopesExample() {
	const [granted, setGranted] = useState(["Read"]);
	const levels = ["Read", "Write", "Manage"];
	return (
		<PreviewCanvas>
			<div role="group" aria-label="Access token scopes" className="flex flex-wrap gap-2">
				{levels.map((level) => (
					<Chip
						key={level}
						pressed={granted.includes(level)}
						onPressedChange={(pressed) =>
							setGranted((current) =>
								pressed ? [...current, level] : current.filter((item) => item !== level),
							)
						}
					>
						{level}
					</Chip>
				))}
			</div>
		</PreviewCanvas>
	);
}

/** A Chip used as a tooltip trigger. */
export function TooltipExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<Chip defaultPressed>Manage</Chip>
				</Tooltip.Trigger>
				<Tooltip.Content>Manage resources and settings</Tooltip.Content>
			</Tooltip.Root>
		</PreviewCanvas>
	);
}

/** A Chip composed onto an app-owned button. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<Chip asChild>
				<button type="button">Read</button>
			</Chip>
		</PreviewCanvas>
	);
}
