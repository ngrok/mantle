import { Button } from "@ngrok/mantle/button";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import {
	ThemeDropdownMenuItem,
	ThemeSwitcher,
	ThemeSwitcherIcon,
	useThemeToggle,
} from "@ngrok/mantle/theme-switcher";

import { PreviewCanvas } from "~/components/preview-canvas";

export function CustomizedExample() {
	return <ThemeSwitcher appearance="outlined" label="Cambiar tema" />;
}

export function EmbeddedMenuExample() {
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<Button type="button" appearance="outlined" intent="neutral">
					Account
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Item>Profile</DropdownMenu.Item>
				<ThemeDropdownMenuItem />
				<DropdownMenu.Separator />
				<DropdownMenu.Item>Log out</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}

export function IconFirstMenuExample() {
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<Button type="button" appearance="outlined" intent="neutral">
					Account
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Item>Profile</DropdownMenu.Item>
				<ThemeDropdownMenuItem>
					<ThemeSwitcherIcon />
					Theme
				</ThemeDropdownMenuItem>
				<DropdownMenu.Separator />
				<DropdownMenu.Item>Log out</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}

export function ThemeItem() {
	const toggle = useThemeToggle();

	return (
		<DropdownMenu.Item disabled={toggle.disabled} onSelect={toggle.onSelect}>
			<ThemeSwitcherIcon />
			Appearance
		</DropdownMenu.Item>
	);
}

export function HookMenuExample() {
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<Button type="button" appearance="outlined" intent="neutral">
					Account
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Item>Profile</DropdownMenu.Item>
				<ThemeItem />
				<DropdownMenu.Separator />
				<DropdownMenu.Item>Log out</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}

/** The first example on the Theme Switcher docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<ThemeSwitcher />
		</PreviewCanvas>
	);
}

/** The "Customizing" example on the Theme Switcher docs page. */
export function CustomizingExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<CustomizedExample />
		</PreviewCanvas>
	);
}

/** The "Embedding in an existing menu" example on the Theme Switcher docs page. */
export function EmbeddingInAnExistingMenuExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<EmbeddedMenuExample />
		</PreviewCanvas>
	);
}

/** The "Laying out the row" example on the Theme Switcher docs page. */
export function LayingOutTheRowExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<IconFirstMenuExample />
		</PreviewCanvas>
	);
}

/** The "Wiring your own menu item" example on the Theme Switcher docs page. */
export function WiringYourOwnMenuItemExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<HookMenuExample />
		</PreviewCanvas>
	);
}
