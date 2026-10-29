/**
 * Re-exports for ThemeSwitcher, the canonical light/dark toggle for headers
 * and toolbars, and ThemeDropdownMenuItem, the same toggle as one item for
 * any `DropdownMenu.Content` or `DropdownMenu.SubContent`. ThemeSwitcherIcon
 * and useThemeToggle compose the same toggle into a menu item you lay out.
 *
 * @see https://mantle.ngrok.com/components/forms/theme-switcher
 */

export {
	//,
	ThemeDropdownMenuItem,
	ThemeSwitcher,
	ThemeSwitcherIcon,
	useThemeToggle,
} from "./theme-switcher.js";

export type {
	//,
	ThemeDropdownMenuItemProps,
	ThemeSwitcherIconProps,
	ThemeSwitcherProps,
	ThemeToggle,
} from "./theme-switcher.js";
