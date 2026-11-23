import { Command } from "@ngrok/mantle/command";
import { cx } from "@ngrok/mantle/cx";

export const RepositoryGroup = () => (
	<Command.Group
		heading="Repositories"
		className="*:[[data-slot~=command-group-heading]]:uppercase"
	>
		<Command.Item className="[&[data-slot~=command-item]]:px-3">ngrok/mantle</Command.Item>
	</Command.Group>
);

export const groupClass = "[&_[data-slot~=command-group]]:px-2";

export const inputClass = cx(`[&_[data-slot~=command-input]]:h-12`);

export const rootClass = "[&[data-slot~=command]]:rounded [&_[data-slot~=command-item]]:px-1";

// An attribute cmdk named that Command never had keeps its selector.
export const label = "[&_[cmdk-label]]:sr-only";
