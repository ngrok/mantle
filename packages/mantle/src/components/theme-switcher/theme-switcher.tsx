"use client";

import type { ComponentProps } from "react";
import type { WithStyleProps } from "../../types/with-style-props.js";
import { BrowserOnly } from "../browser-only/browser-only.js";
import { IconButton } from "../button/icon-button.js";
import { DropdownMenu } from "../dropdown-menu/index.js";
import { Icon } from "../icon/icon.js";
import { AutoThemeIcon, ThemeIcon } from "../icons/theme.js";
import { Skeleton } from "../skeleton/index.js";
import { useTheme } from "../theme/theme-provider.js";
import type { Theme } from "../theme/themes.js";
import { $theme, isTheme, themes } from "../theme/themes.js";

/**
 * Menu item labels for each mantle theme. Typed as a complete
 * `Record<Theme, string>` so adding a new theme to the `themes` tuple without
 * a label is a compile error here.
 */
const themeLabels: Record<Theme, string> = {
	system: "System Preference",
	light: "Light Mode",
	dark: "Dark Mode",
	"light-high-contrast": "Light High Contrast",
	"dark-high-contrast": "Dark High Contrast",
};

/**
 * The props for the `ThemeDropdownMenuRadioGroup` component.
 */
type ThemeDropdownMenuRadioGroupProps = WithStyleProps;

/**
 * Must render inside a `DropdownMenu.Content` or `DropdownMenu.SubContent` —
 * the type system cannot express this constraint, so it is on you to uphold it.
 *
 * The theme-selection radio group for mantle's theme system. Renders one
 * `role="menuitemradio"` item per mantle theme via `DropdownMenu.RadioGroup`;
 * the active theme is `aria-checked` and choosing an item persists the new
 * theme through `useTheme`, so a `ThemeProvider` ancestor is required
 * (`useTheme` throws outside of one). Use it to embed theme selection in an
 * existing menu (e.g. an account menu submenu); for a standalone picker,
 * reach for `ThemeSwitcher` instead.
 *
 * @see https://mantle.ngrok.com/components/forms/theme-switcher
 *
 * @example
 * Standalone inside a `DropdownMenu.Content`:
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined">Theme</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <ThemeDropdownMenuRadioGroup />
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 *
 * @example
 * Embedded in a submenu of an existing menu (e.g. an account menu):
 * ```tsx
 * <DropdownMenu.Root>
 *   <DropdownMenu.Trigger asChild>
 *     <Button type="button" appearance="outlined">Account</Button>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item>Profile</DropdownMenu.Item>
 *     <DropdownMenu.Sub>
 *       <DropdownMenu.SubTrigger>Theme</DropdownMenu.SubTrigger>
 *       <DropdownMenu.SubContent>
 *         <ThemeDropdownMenuRadioGroup />
 *       </DropdownMenu.SubContent>
 *     </DropdownMenu.Sub>
 *   </DropdownMenu.Content>
 * </DropdownMenu.Root>
 * ```
 */
const ThemeDropdownMenuRadioGroup = ({ className, style }: ThemeDropdownMenuRadioGroupProps) => {
	const [currentTheme, setTheme] = useTheme();

	return (
		<DropdownMenu.RadioGroup
			data-slot="theme-dropdown-menu-radio-group"
			className={className}
			style={style}
			value={currentTheme}
			onValueChange={(value) => {
				if (isTheme(value)) {
					setTheme(value);
				}
			}}
		>
			{themes.map((theme) => (
				<DropdownMenu.RadioItem key={theme} value={$theme(theme)}>
					<Icon svg={<ThemeIcon theme={theme} />} />
					{themeLabels[theme]}
				</DropdownMenu.RadioItem>
			))}
		</DropdownMenu.RadioGroup>
	);
};
ThemeDropdownMenuRadioGroup.displayName = "ThemeDropdownMenuRadioGroup";

/**
 * The props for the `ThemeSwitcher` component.
 */
type ThemeSwitcherProps = WithStyleProps &
	Partial<Pick<ComponentProps<typeof IconButton>, "appearance">> & {
		/**
		 * Props forwarded to the menu's `DropdownMenu.Content` — positioning and
		 * collision behavior (`align`, `side`, `collisionPadding`, …) plus
		 * `className`/`style` for the popover the trigger opens. To own the whole
		 * menu instead, compose `ThemeDropdownMenuRadioGroup` in your own
		 * `DropdownMenu`.
		 *
		 * @example
		 * ```tsx
		 * <ThemeSwitcher contentProps={{ collisionPadding: { right: 16 } }} />
		 * ```
		 */
		contentProps?: Omit<ComponentProps<typeof DropdownMenu.Content>, "children">;
		/**
		 * The accessible name for the trigger `IconButton`. Visually hidden but
		 * announced to screen readers. Override it for localization.
		 *
		 * @default "Change Theme"
		 */
		label?: string;
	};

/**
 * The canonical picker for mantle's theme system: a compact `IconButton`
 * trigger (ghost by default) that opens a `DropdownMenu` hosting
 * `ThemeDropdownMenuRadioGroup`, the theme-selection radio group.
 *
 * Reads and writes the active theme via `useTheme`, so it must render inside
 * a `ThemeProvider` — `useTheme` throws outside of one. The trigger icon is
 * SSR-safe: the applied theme is unknowable server-side, so a `Skeleton`
 * renders until hydration, then the icon matching the applied theme.
 *
 * To embed theme selection in an existing menu instead (e.g. an account menu
 * submenu), use `ThemeDropdownMenuRadioGroup` directly.
 *
 * @see https://mantle.ngrok.com/components/forms/theme-switcher
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <header>
 *     <ThemeSwitcher />
 *   </header>
 * </ThemeProvider>
 * ```
 */
const ThemeSwitcher = ({
	appearance,
	className,
	contentProps,
	label = "Change Theme",
	style,
}: ThemeSwitcherProps) => (
	<DropdownMenu.Root>
		<DropdownMenu.Trigger asChild>
			<IconButton
				type="button"
				appearance={appearance ?? "ghost"}
				className={className}
				data-slot="theme-switcher"
				intent="neutral"
				icon={
					<BrowserOnly fallback={<Skeleton className="rounded-full size-5" />}>
						{() => <AutoThemeIcon className="size-5" />}
					</BrowserOnly>
				}
				label={label}
				style={style}
			/>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content {...contentProps}>
			<ThemeDropdownMenuRadioGroup />
		</DropdownMenu.Content>
	</DropdownMenu.Root>
);
ThemeSwitcher.displayName = "ThemeSwitcher";

export {
	//,
	ThemeDropdownMenuRadioGroup,
	ThemeSwitcher,
};

export type {
	//,
	ThemeDropdownMenuRadioGroupProps,
	ThemeSwitcherProps,
};
