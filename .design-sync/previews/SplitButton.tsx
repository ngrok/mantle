import {
	CopyIcon,
	FileTextIcon,
	Icon,
	PlusIcon,
	RocketLaunchIcon,
	SplitButton,
} from "@ngrok/mantle";

export const Default = () => (
	<SplitButton.Root>
		<SplitButton.PrimaryAction icon={<CopyIcon />}>Copy page</SplitButton.PrimaryAction>
		<SplitButton.MenuTrigger label="Open actions menu" />
		<SplitButton.MenuContent>
			<SplitButton.MenuItem>
				<Icon svg={<CopyIcon />} />
				Copy page
			</SplitButton.MenuItem>
			<SplitButton.MenuItem>
				<Icon svg={<FileTextIcon />} />
				View as Markdown
			</SplitButton.MenuItem>
		</SplitButton.MenuContent>
	</SplitButton.Root>
);

export const Sizes = () => (
	<div className="flex flex-col items-start gap-3">
		{(["sm", "md", "lg"] as const).map((size) => (
			<SplitButton.Root key={size} size={size}>
				<SplitButton.PrimaryAction icon={<PlusIcon />}>New endpoint</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="Open create options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>New domain</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>
		))}
	</div>
);

export const Disabled = () => (
	<SplitButton.Root>
		<SplitButton.PrimaryAction icon={<RocketLaunchIcon />} disabled>
			Deploy policy
		</SplitButton.PrimaryAction>
		<SplitButton.MenuTrigger label="Open deploy options" disabled />
		<SplitButton.MenuContent>
			<SplitButton.MenuItem>Deploy to staging</SplitButton.MenuItem>
		</SplitButton.MenuContent>
	</SplitButton.Root>
);
