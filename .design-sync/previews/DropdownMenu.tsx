import {
	Button,
	DesktopIcon,
	DropdownMenu,
	GearIcon,
	Icon,
	MoonIcon,
	SignOutIcon,
	SunIcon,
} from "@ngrok/mantle";

export const AccountMenu = () => (
	<DropdownMenu.Root defaultOpen modal={false}>
		<DropdownMenu.Trigger asChild>
			<Button type="button" appearance="filled" intent="neutral">
				Account
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start">
			<DropdownMenu.Label>ada@ngrok.com</DropdownMenu.Label>
			<DropdownMenu.Separator />
			<DropdownMenu.RadioGroup value="system">
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
			<DropdownMenu.CheckboxItem checked>Email alerts</DropdownMenu.CheckboxItem>
			<DropdownMenu.Item className="flex items-center gap-2">
				<Icon svg={<GearIcon />} />
				Account settings
				<DropdownMenu.Shortcut>⌘,</DropdownMenu.Shortcut>
			</DropdownMenu.Item>
			<DropdownMenu.Item disabled>Billing</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item className="flex items-center gap-2">
				<Icon svg={<SignOutIcon />} />
				Log out
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
);
