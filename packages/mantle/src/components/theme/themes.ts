/**
 * The four concrete themes `"system"` resolves to.
 *
 * @see https://mantle.ngrok.com/components/primitives/theme
 */
const resolvedThemes = ["light", "dark", "light-high-contrast", "dark-high-contrast"] as const;

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

	return themes.includes(value as Theme);
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

	return resolvedThemes.includes(value as ResolvedTheme);
}

export {
	//,
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
