import { Button } from "@ngrok/mantle/button";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Icon } from "@ngrok/mantle/icon";
import { Tooltip } from "@ngrok/mantle/tooltip";
import { DesktopIcon } from "@phosphor-icons/react/dist/ssr/Desktop";
import { GearIcon } from "@phosphor-icons/react/dist/ssr/Gear";
import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { useState } from "react";

import { PreviewCanvas } from "~/components/preview-canvas";

export const DropdownMenuExample = () => {
	const [selectedTheme, setSelectedTheme] = useState("system");
	const [enableNotifications, setEnableNotifications] = useState(false);

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<Button type="button" appearance="filled" intent="neutral">
					Open menu
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Label>corby.pickles@ngork.com</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.RadioGroup
					value={selectedTheme}
					onValueChange={(value) => {
						setSelectedTheme(value);
					}}
				>
					<DropdownMenu.RadioItem value="system">
						<Icon svg={<DesktopIcon />} />
						System preference
					</DropdownMenu.RadioItem>
					<DropdownMenu.RadioItem value="light">
						<Icon svg={<SunIcon />} />
						Light mode
					</DropdownMenu.RadioItem>
					<DropdownMenu.RadioItem value="dark">
						<Icon svg={<MoonIcon />} />
						Dark mode
					</DropdownMenu.RadioItem>
				</DropdownMenu.RadioGroup>
				<DropdownMenu.Separator />
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<DropdownMenu.Item className="flex items-center gap-2" disabled>
							<Icon svg={<GearIcon />} />
							User settings
						</DropdownMenu.Item>
					</Tooltip.Trigger>
					<Tooltip.Content side="left">Only winners get user settings.</Tooltip.Content>
				</Tooltip.Root>
				<DropdownMenu.Separator />
				<DropdownMenu.CheckboxItem
					checked={enableNotifications}
					onCheckedChange={(value) => {
						setEnableNotifications(value);
					}}
				>
					Enable notifications
				</DropdownMenu.CheckboxItem>
				<DropdownMenu.Group>
					<DropdownMenu.Item>Team</DropdownMenu.Item>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>Invite users</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<DropdownMenu.Item>Email</DropdownMenu.Item>
							<DropdownMenu.Item>Message</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item>More...</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
					<DropdownMenu.Item>
						New team
						<DropdownMenu.Shortcut>⌘+T</DropdownMenu.Shortcut>
					</DropdownMenu.Item>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Item className="flex items-center gap-2">
					<Icon svg={<SignOutIcon />} />
					Log out
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
};

/** The first example on the Dropdown Menu docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160 flex-col gap-6">
			<DropdownMenuExample />
		</PreviewCanvas>
	);
}
