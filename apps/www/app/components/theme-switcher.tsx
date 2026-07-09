import { BrowserOnly } from "@ngrok/mantle/browser-only";
import { IconButton } from "@ngrok/mantle/button";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Icon } from "@ngrok/mantle/icon";
import { AutoThemeIcon, ThemeIcon } from "@ngrok/mantle/icons";
import { Skeleton } from "@ngrok/mantle/skeleton";
import { $theme, isTheme, useTheme } from "@ngrok/mantle/theme";
import type { WithStyleProps } from "@ngrok/mantle/types";
import type { ComponentProps } from "react";

type Props = Pick<ComponentProps<typeof IconButton>, "appearance"> & WithStyleProps;

function ThemeSwitcher(props: Props) {
	const [currentTheme, setTheme] = useTheme();

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<IconButton
					type="button"
					appearance="ghost"
					label="Change Theme"
					icon={
						<BrowserOnly fallback={<Skeleton className="rounded-full size-5" />}>
							{() => <AutoThemeIcon className="size-5" />}
						</BrowserOnly>
					}
					{...props}
				/>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content className="shadow-2xl" collisionPadding={{ right: 16 }}>
				<DropdownMenu.RadioGroup
					value={currentTheme}
					onValueChange={(value) => {
						if (isTheme(value)) {
							setTheme(value);
						}
					}}
				>
					<DropdownMenu.RadioItem name="theme" value={$theme("system")}>
						<Icon svg={<ThemeIcon theme="system" />} />
						System Preference
					</DropdownMenu.RadioItem>
					<DropdownMenu.RadioItem name="theme" value={$theme("light")}>
						<Icon svg={<ThemeIcon theme="light" />} />
						Light Mode
					</DropdownMenu.RadioItem>
					<DropdownMenu.RadioItem name="theme" value={$theme("dark")}>
						<Icon svg={<ThemeIcon theme="dark" />} />
						Dark Mode
					</DropdownMenu.RadioItem>
					<DropdownMenu.RadioItem name="theme" value={$theme("light-high-contrast")}>
						<Icon svg={<ThemeIcon theme="light-high-contrast" />} />
						Light High Contrast
					</DropdownMenu.RadioItem>
					<DropdownMenu.RadioItem name="theme" value={$theme("dark-high-contrast")}>
						<Icon svg={<ThemeIcon theme="dark-high-contrast" />} />
						Dark High Contrast
					</DropdownMenu.RadioItem>
				</DropdownMenu.RadioGroup>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}

export {
	//,
	ThemeSwitcher,
};
