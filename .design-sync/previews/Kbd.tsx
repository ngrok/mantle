import { Kbd } from "@ngrok/mantle";

export const Keys = () => (
	<div className="flex items-center gap-2">
		<Kbd>⌘</Kbd>
		<Kbd>⌃</Kbd>
		<Kbd>⇧</Kbd>
		<Kbd>⌥</Kbd>
		<Kbd>K</Kbd>
		<Kbd aria-label="Enter">↵</Kbd>
	</div>
);

export const Shortcuts = () => (
	<div className="flex w-72 flex-col gap-3 text-sm">
		<div className="flex items-center justify-between gap-8">
			<span>Open command palette</span>
			<div className="flex items-center gap-1">
				<Kbd aria-label="Command">⌘</Kbd>
				<Kbd>K</Kbd>
			</div>
		</div>
		<div className="flex items-center justify-between gap-8">
			<span>Search endpoints</span>
			<Kbd>/</Kbd>
		</div>
		<div className="flex items-center justify-between gap-8">
			<span>Toggle theme</span>
			<div className="flex items-center gap-1">
				<Kbd aria-label="Control">⌃</Kbd>
				<Kbd aria-label="Shift">⇧</Kbd>
				<Kbd>L</Kbd>
			</div>
		</div>
	</div>
);

export const InProse = () => (
	<p className="max-w-md text-sm">
		Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> to jump to any endpoint, domain, or agent.
	</p>
);
