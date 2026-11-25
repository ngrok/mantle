import { CubeIcon } from "@phosphor-icons/react/Cube";
import { Chip } from "@ngrok/mantle/chip";
import { Field } from "@ngrok/mantle/field";
import { Tooltip } from "@ngrok/mantle/tooltip";
import { useState } from "react";
import { PreviewCanvas } from "~/components/preview-canvas";

/** A selectable compact value. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Chip selectable>Read</Chip>
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

/** A selectable chip whose icon changes weight with its state. */
export function IconExample() {
	const [pressed, setPressed] = useState(false);
	return (
		<PreviewCanvas>
			<Chip
				selectable
				pressed={pressed}
				onPressedChange={setPressed}
				icon={<CubeIcon weight={pressed ? "fill" : "regular"} />}
			>
				Model A
			</Chip>
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

/** The pill and square Chip appearances. */
export function AppearanceExample() {
	return (
		<PreviewCanvas>
			<div className="flex flex-wrap items-start justify-center gap-6">
				<Field.Set className="w-auto items-center">
					<Field.Legend className="w-full text-center">Appearance pill (default)</Field.Legend>
					<Chip size="sm" onRemove={() => {}} removeLabel="Remove us-east-1">
						us-east-1
					</Chip>
				</Field.Set>
				<Field.Set className="w-auto items-center">
					<Field.Legend className="w-full text-center">Appearance square</Field.Legend>
					<Chip appearance="square" size="sm" onRemove={() => {}} removeLabel="Remove eu-west-1">
						eu-west-1
					</Chip>
				</Field.Set>
			</div>
		</PreviewCanvas>
	);
}

/** Every Chip size on the Button scale. */
export function SizeExample() {
	return (
		<PreviewCanvas>
			<div className="flex flex-wrap items-start justify-center gap-6">
				<Field.Set className="w-auto items-center">
					<Field.Legend className="w-full text-center">Size xs (default)</Field.Legend>
					<Chip selectable size="xs">
						Read
					</Chip>
				</Field.Set>
				<Field.Set className="w-auto items-center">
					<Field.Legend className="w-full text-center">Size sm</Field.Legend>
					<Chip selectable size="sm">
						Read
					</Chip>
				</Field.Set>
				<Field.Set className="w-auto items-center">
					<Field.Legend className="w-full text-center">Size md</Field.Legend>
					<Chip selectable size="md">
						Read
					</Chip>
				</Field.Set>
				<Field.Set className="w-auto items-center">
					<Field.Legend className="w-full text-center">Size lg</Field.Legend>
					<Chip selectable size="lg">
						Read
					</Chip>
				</Field.Set>
				<Field.Set className="w-auto items-center">
					<Field.Legend className="w-full text-center">Size xl</Field.Legend>
					<Chip selectable size="xl">
						Read
					</Chip>
				</Field.Set>
			</div>
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
