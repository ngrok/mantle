/**
 * Color palette named colors
 */
const namedColors = [
	"amber",
	"blue",
	"cyan",
	"emerald",
	"fuchsia",
	"gray",
	"green",
	"indigo",
	"lime",
	"orange",
	"pink",
	"purple",
	"red",
	"rose",
	"sky",
	"teal",
	"violet",
	"yellow",
] as const;

/**
 * A named color from the color palette
 */
type NamedColor = (typeof namedColors)[number];

/**
 * Check if a value is a color from the color palette
 */
const isNamedColor = (value: unknown): value is NamedColor =>
	typeof value === "string" && namedColors.some((item) => item === value);

/**
 * Functional named colors
 */
const functionalColors = [
	"important",
	"info",
	"accent",
	"danger",
	"neutral",
	"success",
	"warning",
] as const;

/**
 * A functional color
 */
type FunctionalColor = (typeof functionalColors)[number];

/**
 * Check if a value is a color from the functional colors
 */
const isFunctionalColor = (value: unknown): value is FunctionalColor =>
	typeof value === "string" && functionalColors.some((item) => item === value);

/**
 * All named mantle colors
 */
const colors = [...namedColors, ...functionalColors] as const;

/**
 * A named mantle color
 */
type Color = (typeof colors)[number];

/**
 * Check if a value is a named mantle color
 */
const isColor = (value: unknown): value is Color =>
	typeof value === "string" && colors.some((item) => item === value);

// MARK: - Exports

export {
	//,
	colors,
	functionalColors,
	isColor,
	isFunctionalColor,
	isNamedColor,
	namedColors,
};

export type {
	//,
	Color,
	FunctionalColor,
	NamedColor,
};
