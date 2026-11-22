"use client";

import { DesktopIcon } from "@phosphor-icons/react/Desktop";
import { MoonIcon } from "@phosphor-icons/react/Moon";
import { SunIcon } from "@phosphor-icons/react/Sun";
import type { SvgAttributes } from "../icon/types.js";
import { useAppliedTheme } from "../theme/theme-provider.js";
import type { Theme } from "../theme/themes.js";

/**
 * An icon that automatically adapts to the current applied theme.
 * - `light`: SunIcon
 * - `dark`: MoonIcon
 *
 * @see https://mantle.ngrok.com/components/data-display/icons
 *
 * @example
 * ```tsx
 * <AutoThemeIcon className="size-5" />
 * ```
 */
function AutoThemeIcon(props: SvgAttributes) {
	const appliedTheme = useAppliedTheme();

	return <ThemeIcon theme={appliedTheme} {...props} />;
}
type ThemeIconProps = SvgAttributes & { theme: Theme };

/**
 * An icon that adapts to a specific theme.
 * It renders a different icon for each `theme`:
 * - `system`: DesktopIcon
 * - `light`: SunIcon
 * - `dark`: MoonIcon
 *
 * @see https://mantle.ngrok.com/components/data-display/icons
 *
 * @example
 * ```tsx
 * <ThemeIcon theme="system" />
 * ```
 */
function ThemeIcon({ theme, ...props }: ThemeIconProps) {
	// Why the weight after the spread: the published build then keeps only the regular paths.
	switch (theme) {
		case "system":
			return <DesktopIcon {...props} weight="regular" />;
		case "light":
			return <SunIcon {...props} weight="regular" />;
		case "dark":
			return <MoonIcon {...props} weight="regular" />;
	}
}
export {
	//,
	AutoThemeIcon,
	ThemeIcon,
};
