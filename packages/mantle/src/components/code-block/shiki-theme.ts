/**
 * The Shiki theme name that mantle's highlighters register.
 */
const mantleShikiThemeName = "mantle-css-variables";

/**
 * The token scopes that mantle adds to Shiki's CSS-variables theme. Each one
 * maps a scope to a `--shiki-token-*` variable, with a fallback to the variable
 * of Shiki's own group. The server highlighter and the browser highlighter add
 * the same list, so code has the same colors from each source.
 */
const mantleShikiTokenColors = [
	{
		scope: ["entity.name.type", "entity.name.class", "support.type", "support.class"],
		settings: { foreground: "var(--shiki-token-type, var(--shiki-token-function))" },
	},
	{
		scope: ["variable", "variable.parameter", "variable.other"],
		settings: { foreground: "var(--shiki-token-variable, var(--shiki-foreground))" },
	},
	{
		scope: ["keyword.operator", "keyword.operator.assignment", "keyword.operator.comparison"],
		settings: { foreground: "var(--shiki-token-operator, var(--shiki-token-keyword))" },
	},
	{
		scope: ["entity.other.attribute-name"],
		settings: { foreground: "var(--shiki-token-attribute, var(--shiki-token-constant))" },
	},
	{
		scope: ["meta.object-literal.key", "support.type.property-name", "entity.name.tag.yaml"],
		settings: { foreground: "var(--shiki-token-property, var(--shiki-token-function))" },
	},
	{
		scope: ["constant.character.escape"],
		settings: { foreground: "var(--shiki-token-escape, var(--shiki-token-constant))" },
	},
	{
		scope: ["string.unquoted.plain.out.yaml", "string.unquoted.plain.in.yaml"],
		settings: { foreground: "var(--shiki-token-variable, var(--shiki-foreground))" },
	},
	{
		scope: ["punctuation.definition.block.sequence.item.yaml"],
		settings: { foreground: "var(--shiki-token-variable, var(--shiki-foreground))" },
	},
];

export {
	//,
	mantleShikiThemeName,
	mantleShikiTokenColors,
};
