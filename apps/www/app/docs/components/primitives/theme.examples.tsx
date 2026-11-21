import { Select } from "@ngrok/mantle/select";
import { $theme, isTheme, useTheme } from "@ngrok/mantle/theme";
import { ThemeSwitcher } from "@ngrok/mantle/theme-switcher";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";

import { PreviewCanvas } from "~/components/preview-canvas";

export function ThemeSelectExample() {
	const [currentTheme, setTheme] = useTheme();

	return (
		<Select.Root
			value={currentTheme}
			onValueChange={(value) => {
				if (isTheme(value)) {
					setTheme(value);
				}
			}}
		>
			<Select.Trigger className="w-min" aria-label="Theme">
				<SunIcon className="mr-1 h-6 w-6" />
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					<Select.Label>Choose a theme</Select.Label>
					<Select.Item value={$theme("system")}>System</Select.Item>
					<Select.Item value={$theme("light")}>Light</Select.Item>
					<Select.Item value={$theme("dark")}>Dark</Select.Item>
				</Select.Group>
			</Select.Content>
		</Select.Root>
	);
}

/** The first example on the Theme docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<ThemeSelectExample />
		</PreviewCanvas>
	);
}

/** The "Theme switcher" example on the Theme docs page. */
export function ThemeSwitcherExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<ThemeSwitcher />
		</PreviewCanvas>
	);
}
