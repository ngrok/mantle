import darkCssUrl from "@ngrok/mantle/mantle-dark.css?url";
import darkHighContrastCssUrl from "@ngrok/mantle/mantle-dark-high-contrast.css?url";
import lightHighContrastCssUrl from '@ngrok/mantle/mantle-light-high-contrast.css?url';
import {
	MantleStyleSheets,
	mantleStyleSheetUrls,
	MantleStyleSheets as Sheets,
	mantleStyleSheetUrls as toUrls,
	PreventWrongThemeFlashScript,
} from "@ngrok/mantle/theme";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { ThemeDropdownMenuRadioGroup, ThemeSwitcher } from "@ngrok/mantle/theme-switcher";
import { ThemeSwitcher as MantleThemeSwitcher } from "@ngrok/mantle/theme-switcher";
import { OtherSheets, otherUrls } from "./other";
import type { ControlledProps } from "./other";

const themeUrls = mantleStyleSheetUrls({
	darkCssUrl,
	lightHighContrastCssUrl,
	darkHighContrastCssUrl,
});

const keyedUrls = toUrls({
	lightHighContrastCssUrl: lightHighContrastCssUrl,
	darkCssUrl: darkCssUrl,
	darkHighContrastCssUrl: darkHighContrastCssUrl,
});

// negative: another function's object keeps its keys
export const otherThemeUrls = otherUrls({ darkCssUrl, lightHighContrastCssUrl });

export function Head({ nonce, ssrCookie }: { nonce: string; ssrCookie?: string }) {
	return (
		<head>
			<PreventWrongThemeFlashScript nonce={nonce} forceTheme="dark" />
			<MantleStyleSheets {...themeUrls} nonce={nonce} ssrCookie={ssrCookie} />
			<Sheets {...keyedUrls} forceTheme="dark" lightHighContrastCssUrl="/l.css" darkHighContrastCssUrl="/d.css" />
			{/* negative: another library's component keeps its props */}
			<OtherSheets nonce={nonce} ssrCookie={ssrCookie} />
		</head>
	);
}

export function Header() {
	return (
		<header>
			<ThemeSwitcher.Root>
				<ThemeSwitcher.Trigger />
				<ThemeSwitcher.Content />
			</ThemeSwitcher.Root>
		</header>
	);
}

export function Footer() {
	return (
		<footer>
			<MantleThemeSwitcher.Root>
				<MantleThemeSwitcher.Trigger appearance="outlined" label="Choose a theme" />
				<MantleThemeSwitcher.Content className="shadow-2xl" collisionPadding={{ right: 16 }} />
			</MantleThemeSwitcher.Root>
		</footer>
	);
}

// negative: a controlled Root stays manual
export function Controlled({ open, onOpenChange }: ControlledProps) {
	return (
		<ThemeSwitcher.Root open={open} onOpenChange={onOpenChange}>
			<ThemeSwitcher.Trigger />
			<ThemeSwitcher.Content />
		</ThemeSwitcher.Root>
	);
}

// negative: Content with menu items stays manual
export function Extended() {
	return (
		<ThemeSwitcher.Root>
			<ThemeSwitcher.Trigger />
			<ThemeSwitcher.Content>
				<ThemeDropdownMenuRadioGroup />
				<DropdownMenu.Item>Appearance settings</DropdownMenu.Item>
			</ThemeSwitcher.Content>
		</ThemeSwitcher.Root>
	);
}

// negative: a local binding shadows the import
export function Shadowed({ ThemeSwitcher }: { ThemeSwitcher: typeof MantleThemeSwitcher }) {
	return (
		<ThemeSwitcher.Root>
			<ThemeSwitcher.Trigger />
			<ThemeSwitcher.Content />
		</ThemeSwitcher.Root>
	);
}
