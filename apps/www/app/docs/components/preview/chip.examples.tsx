import { CubeIcon } from "@phosphor-icons/react/Cube";
import { Chip } from "@ngrok/mantle/chip";
import { Tooltip } from "@ngrok/mantle/tooltip";
import { useState } from "react";
import { PreviewCanvas } from "~/components/preview-canvas";

/** A plain compact label. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Chip>Read</Chip>
		</PreviewCanvas>
	);
}

/** A value with a remove control. */
export function RemovableExample() {
	const [showModel, setShowModel] = useState(true);
	return (
		<PreviewCanvas>
			{showModel && (
				<Chip onRemove={() => setShowModel(false)} removeLabel="Remove model A">
					Model A
				</Chip>
			)}
		</PreviewCanvas>
	);
}

/** A chip whose remove control is locked. */
export function LockedExample() {
	return (
		<PreviewCanvas>
			<Chip locked onRemove={() => {}} removeLabel="Remove global scope">
				Global scope
			</Chip>
		</PreviewCanvas>
	);
}

/** A chip with an icon beside its label. */
export function IconExample() {
	return (
		<PreviewCanvas>
			<Chip icon={<CubeIcon />}>Model A</Chip>
		</PreviewCanvas>
	);
}

/** A selectable chip with its own pressed state. */
export function SelectableExample() {
	return (
		<PreviewCanvas className="gap-2">
			<Chip selectable>Read</Chip>
			<Chip selectable defaultPressed>
				Write
			</Chip>
			<Chip selectable>Manage</Chip>
		</PreviewCanvas>
	);
}

/** A selectable chip whose pressed state belongs to the page. */
export function ControlledExample() {
	const [pressed, setPressed] = useState(false);
	return (
		<PreviewCanvas>
			<Chip selectable pressed={pressed} onPressedChange={setPressed}>
				Write
			</Chip>
		</PreviewCanvas>
	);
}

/** The two Chip sizes. */
export function SizeExample() {
	return (
		<PreviewCanvas className="gap-3">
			<Chip size="xs">Read</Chip>
			<Chip size="sm">Read</Chip>
		</PreviewCanvas>
	);
}

/** A disabled selectable chip keeps its state visible. */
export function DisabledExample() {
	return (
		<PreviewCanvas className="gap-2">
			<Chip selectable disabled>
				Write
			</Chip>
			<Chip selectable disabled defaultPressed>
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
						selectable
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

/** A selectable chip used as a tooltip trigger. */
export function TooltipExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<Chip selectable defaultPressed>
						Manage
					</Chip>
				</Tooltip.Trigger>
				<Tooltip.Content>Manage resources and settings</Tooltip.Content>
			</Tooltip.Root>
		</PreviewCanvas>
	);
}

/** A selectable Chip composed onto an app-owned button. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<Chip selectable asChild>
				<button type="button">Read</button>
			</Chip>
		</PreviewCanvas>
	);
}
