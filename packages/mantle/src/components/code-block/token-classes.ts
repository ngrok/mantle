/**
 * Maps each color expression of Mantle's Shiki CSS-variables theme to a short
 * token class. `mantle.css` holds the same expressions, so a class renders the
 * same color as the inline style it replaces.
 */
const tokenClassByColor: ReadonlyMap<string, string> = new Map([
	["var(--shiki-token-comment)", "tc"],
	["var(--shiki-token-constant)", "tn"],
	["var(--shiki-token-string)", "ts"],
	["var(--shiki-token-string-expression)", "tx"],
	["var(--shiki-token-keyword)", "tk"],
	["var(--shiki-token-function)", "tf"],
	["var(--shiki-token-parameter)", "tp"],
	["var(--shiki-token-punctuation)", "tu"],
	["var(--shiki-token-type, var(--shiki-token-function))", "tt"],
	["var(--shiki-token-variable, var(--shiki-foreground))", "tv"],
	["var(--shiki-token-operator, var(--shiki-token-keyword))", "to"],
	["var(--shiki-token-attribute, var(--shiki-token-constant))", "ta"],
	["var(--shiki-token-property, var(--shiki-token-function))", "tr"],
	["var(--shiki-token-escape, var(--shiki-token-constant))", "te"],
]);

/** The color that `<code>` already inherits. A run in this color needs no span. */
const foregroundColor = "var(--shiki-foreground)";

/**
 * Returns the token class for a run of the given color: an empty string for
 * the inherited foreground, which needs no class and no style, or `undefined`
 * when the color has no class and must keep its inline style.
 */
function tokenClassForColor(color: string): string | undefined {
	return color === foregroundColor ? "" : tokenClassByColor.get(color);
}

const colorByTokenClass: ReadonlyMap<string, string> = new Map(
	Array.from(tokenClassByColor, ([color, tokenClass]) => [tokenClass, color]),
);

/** Returns the color expression of a token class, or `undefined` for a class this module did not write. */
function colorForTokenClass(tokenClass: string): string | undefined {
	return colorByTokenClass.get(tokenClass);
}

export {
	//,
	colorForTokenClass,
	tokenClassForColor,
};
