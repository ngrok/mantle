import { Command } from "@ngrok/mantle/command";
import { cx } from "@ngrok/mantle/cx";

export const RepositoryGroup = () => (
	<Command.Group heading="Repositories" className="*:[[cmdk-group-heading]]:uppercase">
		<Command.Item className="[&[cmdk-item]]:px-3">ngrok/mantle</Command.Item>
	</Command.Group>
);

export const groupClass = "[&_[cmdk-group]]:px-2";

export const inputClass = cx(`[&_[cmdk-input]]:h-12`);

// An attribute cmdk named that Command never had keeps its selector.
export const label = "[&_[cmdk-label]]:sr-only";
