import { Command, MetaKey } from "@ngrok/mantle/command";
import { CalculatorIcon } from "@phosphor-icons/react/Calculator";
import { CalendarIcon } from "@phosphor-icons/react/Calendar";
import { SmileyIcon } from "@phosphor-icons/react/Smiley";
import { UserIcon } from "@phosphor-icons/react/User";

import { CommandDialogDemo, CommandSearchTriggerDemo } from "~/features/command-demos";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Command docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160 flex flex-col gap-6">
			<CommandSearchTriggerDemo />
		</PreviewCanvas>
	);
}

/** The "Inline palette" example on the Command docs page. */
export function InlinePaletteExample() {
	return (
		<PreviewCanvas className="min-h-160 flex flex-col gap-6">
			<Command.Root className="rounded-lg border border-dialog shadow-lg bg-dialog md:min-w-112.5">
				<Command.Input placeholder="Type a command or search..." />
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>
					<Command.Group heading="Suggestions">
						<Command.Item>
							<CalendarIcon />
							<span>Calendar</span>
						</Command.Item>
						<Command.Item>
							<SmileyIcon />
							<span>Search Emoji</span>
						</Command.Item>
						<Command.Item>
							<CalculatorIcon />
							<span>Calculator</span>
						</Command.Item>
					</Command.Group>
					<Command.Separator />
					<Command.Group heading="Settings">
						<Command.Item>
							<UserIcon />
							<span>Profile</span>
						</Command.Item>
					</Command.Group>
				</Command.List>
			</Command.Root>
		</PreviewCanvas>
	);
}

/** The "Button trigger" example on the Command docs page. */
export function ButtonTriggerExample() {
	return (
		<PreviewCanvas className="min-h-160 flex flex-col gap-6">
			<CommandDialogDemo />
		</PreviewCanvas>
	);
}

/** The "MetaKey" example on the Command docs page. */
export function MetakeyExample() {
	return (
		<PreviewCanvas>
			<kbd className="bg-muted text-muted inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium">
				<MetaKey /> K
			</kbd>
		</PreviewCanvas>
	);
}
