import { HoverCard } from "@ngrok/mantle/hover-card";
import { Popover, Popover as MantlePopover } from "@ngrok/mantle/popover";
import { Tooltip } from "@ngrok/mantle/tooltip";
import * as RadixPopover from "@radix-ui/react-popover";

export const ModelChip = (
	<Popover.Root>
		<Popover.Trigger>Model</Popover.Trigger>
		<Popover.Content
			align="start"
			onOpenAutoFocus={(event) => event.preventDefault()}
			className="max-h-(--available-height) w-(--anchor-width)"
		>
			Models
		</Popover.Content>
	</Popover.Root>
);

// The aliased import is the same part.
export const Aliased = (
	<MantlePopover.Root>
		<MantlePopover.Content sideOffset={8} />
	</MantlePopover.Root>
);

export const Preview = (
	<HoverCard.Root>
		<HoverCard.Trigger href="/user">user</HoverCard.Trigger>
		{/* oxlint-disable-next-line react/jsx-no-useless-fragment -- the codemod leaves a fragment where the portal was */}
		<>
			<HoverCard.Content side="top">Card</HoverCard.Content>
		</>
	</HoverCard.Root>
);

export const Hint = (
	<Tooltip.Root>
		<Tooltip.Trigger>?</Tooltip.Trigger>
		<Tooltip.Content side="right">Help</Tooltip.Content>
	</Tooltip.Root>
);

// Negative cases: another library's Popover keeps its props and its variable.
export const Untouched = (
	<RadixPopover.Root modal>
		<RadixPopover.Content collisionPadding={16} className="w-(--radix-popover-trigger-width)" />
	</RadixPopover.Root>
);

// Negative case: an element in a prop of the content owns its own variable.
export const InProp = (
	<Popover.Content
		// oxlint-disable-next-line react/no-children-prop -- the case is an element in a prop
		children={<RadixPopover.Content className="w-(--radix-popover-trigger-width)" />}
	/>
);

export const InPropSpread = (
	<Popover.Content
		// oxlint-disable-next-line react/no-children-prop -- the case is an element in a prop
		children={<RadixPopover.Content {...{ className: "w-(--radix-popover-trigger-width)" }} />}
	/>
);

// Negative case: a parameter under the import's name shadows it.
export function Shadowed({ Popover }: { Popover: typeof RadixPopover }) {
	return (
		<Popover.Root modal>
			<Popover.Content
				collisionPadding={16}
				className="max-h-(--radix-popover-content-available-height)"
			/>
		</Popover.Root>
	);
}
