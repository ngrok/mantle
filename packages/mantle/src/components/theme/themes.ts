/**
 * The two concrete themes `"system"` resolves to.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */
const resolvedThemes = ["light", "dark"] as const;

/**
 * One concrete theme, never `"system"`.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */
type ResolvedTheme = (typeof resolvedThemes)[number];

/**
 * Every theme a consumer can set, including `"system"`.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */
const themes = ["system", ...resolvedThemes] as const;

/**
 * One theme a consumer can set, including `"system"`.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */
type Theme = (typeof themes)[number];

/**
 * Narrows a theme literal to its own type instead of widening it to `Theme`.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */
const $theme = <T extends Theme = Theme>(value: T) => value;

/**
 * Type predicate that checks if a value is a valid theme.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */
function isTheme(value: unknown): value is Theme {
	if (typeof value !== "string") {
		return false;
	}

	return themes.some((item) => item === value);
}

/**
 * Narrows a resolved-theme literal to its own type instead of widening it to `ResolvedTheme`.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */
const $resolvedTheme = <T extends ResolvedTheme = ResolvedTheme>(value: T) => value;

/**
 * Type predicate that checks if a value is a valid resolved theme.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */
function isResolvedTheme(value: unknown): value is ResolvedTheme {
	if (typeof value !== "string") {
		return false;
	}

	return resolvedThemes.some((item) => item === value);
}

/**
 * Returns the theme a light/dark toggle stores when pressed. The press shows
 * the opposite of the applied theme. When that opposite matches the OS
 * preference, the press returns `"system"` instead of a pin, so a second
 * press always gets the user back to the OS default.
 *
 * @see https://lea.verou.me/blog/2026/dark-mode-toggles/
 *
 * @example
 * ```ts
 * getToggledTheme({ theme: "system", prefersDarkMode: false }); // "dark"
 * getToggledTheme({ theme: "dark", prefersDarkMode: false }); // "system"
 * getToggledTheme({ theme: "system", prefersDarkMode: true }); // "light"
 * ```
 */
function getToggledTheme({
	theme,
	prefersDarkMode,
}: {
	theme: Theme;
	prefersDarkMode: boolean;
}): Theme {
	const systemTheme: ResolvedTheme = prefersDarkMode ? "dark" : "light";
	const appliedTheme = theme === "system" ? systemTheme : theme;
	const nextTheme: ResolvedTheme = appliedTheme === "dark" ? "light" : "dark";

	return nextTheme === systemTheme ? "system" : nextTheme;
}

export {
	//,
	getToggledTheme,
	themes,
	resolvedThemes,
	$resolvedTheme,
	$theme,
	isResolvedTheme,
	isTheme,
};

export type {
	//,
	Theme,
	ResolvedTheme,
};
