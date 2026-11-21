import { parse, type ChildNode } from "postcss";

/**
 * Build mantle's design tokens in the Design Tokens Community Group (DTCG)
 * format, version 2025.10, from the theme stylesheets.
 *
 * @see https://www.designtokens.org/tr/2025.10/format/
 * @see https://www.designtokens.org/tr/2025.10/color/
 * @see https://www.designtokens.org/tr/2025.10/resolver/
 */

/** The published file names, relative to `dist`. The resolver document refers to the other two by these names. */
const TOKEN_FILE_NAMES = {
	tokens: "tokens.json",
	dark: "tokens.dark.json",
	resolver: "tokens.resolver.json",
} as const;

const FORMAT_SCHEMA = "https://www.designtokens.org/schemas/2025.10/format.json";
const RESOLVER_SCHEMA = "https://www.designtokens.org/schemas/2025.10/resolver.json";

/** The `$extensions` key for data that only mantle defines. */
const EXTENSION_KEY = "com.ngrok.mantle";

type ColorComponent = number | "none";

/** A DTCG color value. `hex` is set only for an sRGB color that 8-bit channels hold exactly. */
type ColorValue = {
	colorSpace: "display-p3" | "oklab" | "oklch" | "srgb";
	components: [ColorComponent, ColorComponent, ColorComponent];
	alpha?: number;
	hex?: string;
};

type DimensionValue = { value: number; unit: "px" | "rem" };
type DurationValue = { value: number; unit: "ms" | "s" };

type ShadowValue = {
	color: ColorValue;
	offsetX: DimensionValue;
	offsetY: DimensionValue;
	blur: DimensionValue;
	spread: DimensionValue;
	inset?: true;
};

/** A curly-brace reference to another token, such as `{color.sky.500}`. */
type Alias = `{${string}}`;

/** One DTCG token. Every token carries its own `$type`, also when its value is an alias. */
type Token = (
	| { $type: "color"; $value: ColorValue | Alias }
	| { $type: "cubicBezier"; $value: [number, number, number, number] | Alias }
	| { $type: "dimension"; $value: DimensionValue | Alias }
	| { $type: "duration"; $value: DurationValue | Alias }
	| { $type: "fontFamily"; $value: string | string[] }
	| { $type: "fontWeight"; $value: number | Alias }
	| { $type: "number"; $value: number | Alias }
	| { $type: "shadow"; $value: ShadowValue | ShadowValue[] | Alias }
) & { $description?: string };

type TokenType = Token["$type"];

/** The data mantle adds under `$extensions`: the theme variables that have no DTCG type, with their CSS values. */
type MantleExtensions = { [EXTENSION_KEY]: { skipped: Record<string, string> } };

/** A DTCG group: tokens and groups by name, plus the `$`-prefixed group properties. */
type TokenGroup = { [name: string]: TokenGroup | Token | MantleExtensions | string };

/** A DTCG resolver document, version 2025.10. */
type ResolverDocument = {
	$schema: string;
	name: string;
	version: "2025.10";
	description: string;
	sets: Record<string, { sources: { $ref: string }[] }>;
	modifiers: Record<
		string,
		{ description: string; contexts: Record<string, { $ref: string }[]>; default: string }
	>;
	resolutionOrder: { $ref: string }[];
};

/** The three published documents. */
type DesignTokenFiles = {
	/** Every token, with the light theme's values. */
	tokens: TokenGroup;
	/** Only the tokens whose value changes in the dark theme. */
	darkTokens: TokenGroup;
	/** The resolver document that applies `darkTokens` over `tokens` for the dark context. */
	resolver: ResolverDocument;
};

/**
 * A Tailwind theme namespace that becomes one token group. A variable
 * `--<group>-<name>` becomes the token `<group>.<name>`, and the bare
 * `--<group>` becomes `<group>.$root`.
 */
type Namespace = {
	group: string;
	type: TokenType;
	description: string;
	/** Whether the namespace is one variable, which becomes a top-level token with no group. */
	single?: true;
};

/** The exported namespaces, in document order. */
const NAMESPACES: Namespace[] = [
	{
		group: "color",
		type: "color",
		description:
			"The palette: ramps from 50 to 950, the semantic ramps that alias them, and the chart series colors.",
	},
	{
		group: "background-color",
		type: "color",
		description: "Surface colors for the `bg-*` utilities, such as `bg-card`.",
	},
	{
		group: "border-color",
		type: "color",
		description: "Border colors for the `border-*` utilities.",
	},
	{
		group: "divide-color",
		type: "color",
		description: "Divider colors for the `divide-*` utilities.",
	},
	{
		group: "ring-color",
		type: "color",
		description: "Focus ring colors for the `ring-*` utilities.",
	},
	{
		group: "text-color",
		type: "color",
		description: "Text colors for the `text-*` utilities, such as `text-muted`.",
	},
	{ group: "font", type: "fontFamily", description: "Font stacks for the `font-*` utilities." },
	{
		group: "font-weight",
		type: "fontWeight",
		description: "Font weights for the `font-*` utilities.",
	},
	{ group: "text", type: "dimension", description: "Font sizes for the `text-*` utilities." },
	{
		group: "spacing",
		type: "dimension",
		description:
			"The spacing unit. A spacing utility multiplies it: `p-4` is `calc(var(--spacing) * 4)`.",
	},
	{
		group: "radius",
		type: "dimension",
		description: "Corner radii for the `rounded-*` utilities.",
	},
	{ group: "shadow", type: "shadow", description: "Box shadows for the `shadow-*` utilities." },
	{ group: "z-index", type: "number", description: "Stack orders for the `z-*` utilities." },
	{
		group: "breakpoint",
		type: "dimension",
		description: "Viewport widths for the responsive variants, such as `md:`.",
	},
	{
		group: "container",
		type: "dimension",
		description: "Widths for the `max-w-*` utilities and the container query variants.",
	},
	{
		group: "ease",
		type: "cubicBezier",
		description: "Timing functions for the `ease-*` utilities.",
	},
	{
		group: "default-transition-duration",
		type: "duration",
		description: "The duration of a `transition-*` utility with no `duration-*` utility.",
		single: true,
	},
	{
		group: "default-transition-timing-function",
		type: "cubicBezier",
		description: "The timing function of a `transition-*` utility with no `ease-*` utility.",
		single: true,
	},
];

/** Why: Tailwind's `--text-shadow-*` namespace starts with the `--text-` prefix of the font sizes. */
const IGNORED_PREFIXES = ["--text-shadow"];

/** The namespaces with the longest group first, so `--text-color-muted` matches `text-color` and not `text`. */
const NAMESPACES_BY_LENGTH = NAMESPACES.toSorted(
	(left, right) => right.group.length - left.group.length,
);

/** Where a theme variable goes in the token tree. */
type Location = { namespace: Namespace; path: string[] };

/**
 * Find the token path of a theme variable. Returns `undefined` for a variable
 * outside the exported namespaces, and for a sub-property such as
 * `--text-xs--line-height`.
 *
 * @example
 * locate("--color-sky-500")?.path; // => ["color", "sky", "500"]
 * locate("--shadow")?.path; // => ["shadow", "$root"]
 */
function locate(name: string): Location | undefined {
	if (IGNORED_PREFIXES.some((prefix) => name.startsWith(prefix))) {
		return undefined;
	}
	for (const namespace of NAMESPACES_BY_LENGTH) {
		const base = `--${namespace.group}`;
		if (name === base) {
			return { namespace, path: namespace.single ? [namespace.group] : [namespace.group, "$root"] };
		}
		if (namespace.single || !name.startsWith(`${base}-`)) {
			continue;
		}
		const member = name.slice(base.length + 1);
		if (member.includes("--")) {
			return undefined;
		}
		// Why: a palette ramp nests by stop (`color.sky.500`); every other name stays flat.
		const ramp = /^([a-z]+)-(\d+)$/.exec(member);
		const memberPath = namespace.group === "color" && ramp != null ? ramp.slice(1) : [member];
		return { namespace, path: [namespace.group, ...memberPath] };
	}
	return undefined;
}

/** One node of a parsed CSS value. */
type ValueNode =
	| { kind: "word"; text: string }
	| { kind: "string"; text: string }
	| { kind: "function"; name: string; children: ValueNode[] }
	| { kind: "comma" }
	| { kind: "slash" };

/** Parse the CSS value text from `start` up to the `)` that closes the level, or the end. */
function parseValueNodes(text: string, start: number): { nodes: ValueNode[]; end: number } {
	const nodes: ValueNode[] = [];
	let word = "";
	let index = start;
	const flushWord = () => {
		if (word !== "") {
			nodes.push({ kind: "word", text: word });
			word = "";
		}
	};
	while (index < text.length) {
		const char = text.charAt(index);
		if (char === ")") {
			flushWord();
			return { nodes, end: index };
		}
		if (char === "(") {
			const inner = parseValueNodes(text, index + 1);
			if (text.charAt(inner.end) !== ")") {
				throw new Error(`design-tokens: unclosed "(" in the CSS value "${text}"`);
			}
			nodes.push({ kind: "function", name: word, children: inner.nodes });
			word = "";
			index = inner.end + 1;
			continue;
		}
		if (char === '"' || char === "'") {
			flushWord();
			const close = text.indexOf(char, index + 1);
			if (close === -1) {
				throw new Error(`design-tokens: unclosed string in the CSS value "${text}"`);
			}
			nodes.push({ kind: "string", text: text.slice(index + 1, close) });
			index = close + 1;
			continue;
		}
		if (char === "," || char === "/") {
			flushWord();
			nodes.push({ kind: char === "," ? "comma" : "slash" });
		} else if (/\s/.test(char)) {
			flushWord();
		} else {
			word += char;
		}
		index += 1;
	}
	flushWord();
	return { nodes, end: index };
}

/**
 * Parse a CSS value into words, strings, functions, commas, and slashes.
 * Throws on unbalanced parentheses or an unclosed string.
 *
 * @example
 * parseValue("--alpha(var(--color-neutral-950) / 0.6)");
 * // => [{ kind: "function", name: "--alpha", children: [{ kind: "function", name: "var", … }, { kind: "slash" }, { kind: "word", text: "0.6" }] }]
 */
function parseValue(text: string): ValueNode[] {
	const { nodes, end } = parseValueNodes(text, 0);
	if (end !== text.length) {
		throw new Error(`design-tokens: unbalanced ")" in the CSS value "${text}"`);
	}
	return nodes;
}

/** Split nodes on each separator node of one kind. */
function splitNodes(nodes: ValueNode[], separator: "comma" | "slash"): ValueNode[][] {
	const parts: ValueNode[][] = [[]];
	for (const node of nodes) {
		if (node.kind === separator) {
			parts.push([]);
		} else {
			parts.at(-1)?.push(node);
		}
	}
	return parts;
}

/** Parse a number with an optional unit, such as `0.25rem`, `18.2%`, or `2147483647`. */
function parseNumeric(text: string): { value: number; unit: string } | undefined {
	const match = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z%]*)$/i.exec(text);
	if (match == null) {
		return undefined;
	}
	return { value: Number(match[1]), unit: (match[2] ?? "").toLowerCase() };
}

/** Round off the binary float error that division and trigonometry add, such as `0.18200000000000002`. */
function round(value: number): number {
	return Number.parseFloat(value.toFixed(10));
}

/** The text of a single word node, or `undefined` for anything else. */
function wordText(nodes: ValueNode[]): string | undefined {
	const [node, ...rest] = nodes;
	return node?.kind === "word" && rest.length === 0 ? node.text : undefined;
}

/** The theme variable values in one theme, and the variables a `var()` chain already passed through. */
type Context = { scope: ReadonlyMap<string, string>; seen: ReadonlySet<string> };

/**
 * Read the value of a single `var(--name)` node in the scope. Returns
 * `undefined` for any other nodes, for a fallback, for a variable that the
 * scope does not set, and for a cycle.
 */
function resolveVariable(
	nodes: ValueNode[],
	context: Context,
): { nodes: ValueNode[]; context: Context } | undefined {
	const [node, ...rest] = nodes;
	if (node?.kind !== "function" || node.name !== "var" || rest.length > 0) {
		return undefined;
	}
	const name = wordText(node.children);
	const raw = name == null ? undefined : context.scope.get(name);
	if (name == null || raw == null || context.seen.has(name)) {
		return undefined;
	}
	return {
		nodes: parseValue(raw),
		context: { scope: context.scope, seen: new Set([...context.seen, name]) },
	};
}

/** Parse one color channel. A percentage scales to `percentScale`, as `oklch()` chroma does with 0.4. */
function parseChannel(text: string, percentScale: number): ColorComponent | undefined {
	if (text === "none") {
		return "none";
	}
	const numeric = parseNumeric(text);
	if (numeric == null) {
		return undefined;
	}
	if (numeric.unit === "%") {
		return round((numeric.value / 100) * percentScale);
	}
	return numeric.unit === "" ? numeric.value : undefined;
}

/** Parse an `oklch()` hue: a number or a `deg` angle. */
function parseHue(text: string): ColorComponent | undefined {
	const numeric = parseNumeric(text);
	if (numeric?.unit === "deg") {
		return numeric.value;
	}
	// Why: CSS gives a hue no percentage form.
	return numeric?.unit === "%" ? undefined : parseChannel(text, 1);
}

/** Parse an alpha value: a number from 0 to 1, a percentage, or a `var()` that holds one. */
function parseAlpha(nodes: ValueNode[], context: Context): number | undefined {
	const variable = resolveVariable(nodes, context);
	if (variable != null) {
		return parseAlpha(variable.nodes, variable.context);
	}
	const text = wordText(nodes);
	const alpha = text == null ? undefined : parseChannel(text, 1);
	return typeof alpha === "number" && alpha >= 0 && alpha <= 1 ? alpha : undefined;
}

/** Return the color with a new alpha, which the output leaves out when it is 1. */
function withAlpha(color: ColorValue, alpha: number): ColorValue {
	const result: ColorValue = { colorSpace: color.colorSpace, components: color.components };
	if (alpha !== 1) {
		result.alpha = round(alpha);
	}
	if (color.hex != null) {
		result.hex = color.hex;
	}
	return result;
}

/** Build an sRGB color from channels in the range 0 to 1. */
function srgbColor(channels: [number, number, number], alpha: number): ColorValue {
	const bytes = channels.map((channel) => channel * 255);
	const color: ColorValue = { colorSpace: "srgb", components: channels };
	const exact = bytes.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255);
	const hex = `#${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
	return withAlpha(exact ? { ...color, hex } : color, alpha);
}

/** Parse a `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa` color. */
function parseHexColor(text: string): ColorValue | undefined {
	const digits = text.slice(1);
	if (!/^(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(digits)) {
		return undefined;
	}
	const pairs =
		digits.length <= 4
			? digits.split("").map((digit) => digit + digit)
			: (digits.match(/../g) ?? []);
	const [red = 0, green = 0, blue = 0, alpha = 255] = pairs.map((pair) =>
		Number.parseInt(pair, 16),
	);
	return srgbColor([red / 255, green / 255, blue / 255], round(alpha / 255));
}

/** Split the children of a color function into its channel words and the optional alpha after the `/`. */
function colorChannels(
	children: ValueNode[],
): { channels: string[]; alpha: ValueNode[] | undefined } | undefined {
	const [channelNodes = [], alpha, ...rest] = splitNodes(
		children.filter((node) => node.kind !== "comma"),
		"slash",
	);
	if (rest.length > 0) {
		return undefined;
	}
	const channels = channelNodes.flatMap((node) => (node.kind === "word" ? [node.text] : []));
	return channels.length === channelNodes.length ? { channels, alpha } : undefined;
}

/** Parse the color of a single node: a hex word, a color function, or a `var()` that holds one. */
function toColor(nodes: ValueNode[], context: Context): ColorValue | undefined {
	const variable = resolveVariable(nodes, context);
	if (variable != null) {
		return toColor(variable.nodes, variable.context);
	}
	const [node, ...rest] = nodes;
	if (node == null || rest.length > 0) {
		return undefined;
	}
	if (node.kind === "word") {
		return node.text.startsWith("#") ? parseHexColor(node.text) : undefined;
	}
	if (node.kind !== "function") {
		return undefined;
	}
	switch (node.name) {
		case "--alpha": {
			// Tailwind compiles `--alpha(<color> / <alpha>)` to a `color-mix()` with `transparent`, which scales only the alpha.
			const [color = [], alpha = []] = splitNodes(node.children, "slash");
			const base = toColor(color, context);
			const factor = parseAlpha(alpha, context);
			return base == null || factor == null
				? undefined
				: withAlpha(base, (base.alpha ?? 1) * factor);
		}
		case "color-mix": {
			return toMixedColor(node.children, context);
		}
		default: {
			return parseColorFunction(node.name, node.children, context);
		}
	}
}

/** Parse an `oklch()`, `rgb()`, or `color()` function with literal channels. */
function parseColorFunction(
	name: string,
	children: ValueNode[],
	context: Context,
): ColorValue | undefined {
	const parsed = colorChannels(children);
	if (parsed == null) {
		return undefined;
	}
	const alpha = parsed.alpha == null ? 1 : parseAlpha(parsed.alpha, context);
	if (alpha == null) {
		return undefined;
	}
	if (name === "oklch") {
		const [lightness, chroma, hue] = parsed.channels;
		const components = [
			lightness == null ? undefined : parseChannel(lightness, 1),
			chroma == null ? undefined : parseChannel(chroma, 0.4),
			hue == null ? undefined : parseHue(hue),
		];
		const [l, c, h] = components;
		if (parsed.channels.length !== 3 || l == null || c == null || h == null) {
			return undefined;
		}
		return withAlpha({ colorSpace: "oklch", components: [l, c, h] }, alpha);
	}
	if (name === "rgb" || name === "rgba") {
		const channels = parsed.channels.map((text) => parseChannel(text, 255));
		const [red, green, blue] = channels;
		if (
			channels.length !== 3 ||
			typeof red !== "number" ||
			typeof green !== "number" ||
			typeof blue !== "number"
		) {
			return undefined;
		}
		return srgbColor([round(red / 255), round(green / 255), round(blue / 255)], alpha);
	}
	if (name === "color") {
		const [space, ...rest] = parsed.channels;
		const channels = rest.map((text) => parseChannel(text, 1));
		const [first, second, third] = channels;
		if (
			(space !== "display-p3" && space !== "srgb") ||
			channels.length !== 3 ||
			first == null ||
			second == null ||
			third == null
		) {
			return undefined;
		}
		return withAlpha({ colorSpace: space, components: [first, second, third] }, alpha);
	}
	return undefined;
}

/** Convert an opaque `oklch` or `oklab` color to OKLab components. Returns `undefined` for other colors. */
function toOklab(color: ColorValue): [number, number, number] | undefined {
	const [first, second, third] = color.components.map((component) =>
		component === "none" ? 0 : component,
	);
	if (color.alpha != null || first == null || second == null || third == null) {
		return undefined;
	}
	if (color.colorSpace === "oklab") {
		return [first, second, third];
	}
	if (color.colorSpace === "oklch") {
		const radians = (third * Math.PI) / 180;
		return [first, second * Math.cos(radians), second * Math.sin(radians)];
	}
	return undefined;
}

/**
 * Compute `color-mix(in oklab, <color> <p>%, <color> <q>%)` for two opaque
 * OKLCH or OKLab colors whose weights sum to 100%. Returns `undefined` for
 * any other mix.
 */
function toMixedColor(children: ValueNode[], context: Context): ColorValue | undefined {
	const [method, ...stops] = splitNodes(children, "comma");
	if (
		method == null ||
		method.map((node) => (node.kind === "word" ? node.text : "")).join(" ") !== "in oklab" ||
		stops.length !== 2
	) {
		return undefined;
	}
	const parsedStops = stops.map((stop) => {
		const last = stop.at(-1);
		const percentage =
			last?.kind === "word" && last.text.endsWith("%") ? parseNumeric(last.text) : undefined;
		const color = toColor(percentage == null ? stop : stop.slice(0, -1), context);
		return {
			oklab: color == null ? undefined : toOklab(color),
			weight: percentage == null ? undefined : percentage.value / 100,
		};
	});
	const [first, second] = parsedStops;
	if (first?.oklab == null || second?.oklab == null) {
		return undefined;
	}
	const firstWeight = first.weight ?? (second.weight == null ? 0.5 : 1 - second.weight);
	const secondWeight = second.weight ?? 1 - firstWeight;
	if (round(firstWeight + secondWeight) !== 1) {
		return undefined;
	}
	const [l1, a1, b1] = first.oklab;
	const [l2, a2, b2] = second.oklab;
	return {
		colorSpace: "oklab",
		components: [
			round(l1 * firstWeight + l2 * secondWeight),
			round(a1 * firstWeight + a2 * secondWeight),
			round(b1 * firstWeight + b2 * secondWeight),
		],
	};
}

/** Parse a `px` or `rem` length, or a unitless `0`. */
function toDimension(nodes: ValueNode[], context: Context): DimensionValue | undefined {
	const variable = resolveVariable(nodes, context);
	if (variable != null) {
		return toDimension(variable.nodes, variable.context);
	}
	const text = wordText(nodes);
	const numeric = text == null ? undefined : parseNumeric(text);
	if (numeric == null) {
		return undefined;
	}
	if (numeric.unit === "px" || numeric.unit === "rem") {
		return { value: numeric.value, unit: numeric.unit };
	}
	return numeric.unit === "" && numeric.value === 0 ? { value: 0, unit: "px" } : undefined;
}

/** Parse a number with no unit. */
function toNumber(nodes: ValueNode[], context: Context): number | undefined {
	const variable = resolveVariable(nodes, context);
	if (variable != null) {
		return toNumber(variable.nodes, variable.context);
	}
	const text = wordText(nodes);
	const numeric = text == null ? undefined : parseNumeric(text);
	return numeric?.unit === "" ? numeric.value : undefined;
}

/** Parse an `ms` or `s` time. */
function toDuration(nodes: ValueNode[], context: Context): DurationValue | undefined {
	const variable = resolveVariable(nodes, context);
	if (variable != null) {
		return toDuration(variable.nodes, variable.context);
	}
	const text = wordText(nodes);
	const numeric = text == null ? undefined : parseNumeric(text);
	return numeric?.unit === "ms" || numeric?.unit === "s"
		? { value: numeric.value, unit: numeric.unit }
		: undefined;
}

/** Parse a `cubic-bezier()` function whose x coordinates are in the range 0 to 1. */
function toCubicBezier(
	nodes: ValueNode[],
	context: Context,
): [number, number, number, number] | undefined {
	const variable = resolveVariable(nodes, context);
	if (variable != null) {
		return toCubicBezier(variable.nodes, variable.context);
	}
	const [node, ...rest] = nodes;
	if (node?.kind !== "function" || node.name !== "cubic-bezier" || rest.length > 0) {
		return undefined;
	}
	const points = splitNodes(node.children, "comma").map((point) => toNumber(point, context));
	const [x1, y1, x2, y2] = points;
	if (points.length !== 4 || x1 == null || y1 == null || x2 == null || y2 == null) {
		return undefined;
	}
	return x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1 ? [x1, y1, x2, y2] : undefined;
}

/** Parse a font stack: comma-separated family names, quoted or not. */
function toFontFamily(nodes: ValueNode[], context: Context): string | string[] | undefined {
	const variable = resolveVariable(nodes, context);
	if (variable != null) {
		return toFontFamily(variable.nodes, variable.context);
	}
	const families = splitNodes(nodes, "comma").map((family) => {
		const [first, ...rest] = family;
		if (first?.kind === "string" && rest.length === 0) {
			return first.text;
		}
		const words = family.flatMap((node) => (node.kind === "word" ? [node.text] : []));
		return words.length > 0 && words.length === family.length ? words.join(" ") : undefined;
	});
	const names = families.flatMap((family) => (family == null ? [] : [family]));
	if (names.length !== families.length) {
		return undefined;
	}
	return names.length === 1 ? names[0] : names;
}

/** Parse a font weight from 1 to 1000. */
function toFontWeight(nodes: ValueNode[], context: Context): number | undefined {
	const weight = toNumber(nodes, context);
	return weight != null && weight >= 1 && weight <= 1000 ? weight : undefined;
}

/** Parse one or more comma-separated box shadows with 2 to 4 lengths and one color each. */
function toShadow(nodes: ValueNode[], context: Context): ShadowValue | ShadowValue[] | undefined {
	const variable = resolveVariable(nodes, context);
	if (variable != null) {
		return toShadow(variable.nodes, variable.context);
	}
	const layers = splitNodes(nodes, "comma").map((layer): ShadowValue | undefined => {
		const inset = layer.some((node) => node.kind === "word" && node.text === "inset");
		const rest = layer.filter((node) => !(node.kind === "word" && node.text === "inset"));
		const lengths = rest.flatMap((node) => {
			const length = toDimension([node], context);
			return length == null ? [] : [length];
		});
		const color = toColor(
			rest.filter((node) => toDimension([node], context) == null),
			context,
		);
		const [offsetX, offsetY, blur = { value: 0, unit: "px" }, spread = { value: 0, unit: "px" }] =
			lengths;
		if (color == null || offsetX == null || offsetY == null || lengths.length > 4) {
			return undefined;
		}
		const shadow: ShadowValue = { color, offsetX, offsetY, blur, spread };
		if (inset) {
			shadow.inset = true;
		}
		return shadow;
	});
	const shadows = layers.flatMap((layer) => (layer == null ? [] : [layer]));
	if (shadows.length !== layers.length) {
		return undefined;
	}
	return shadows.length === 1 ? shadows[0] : shadows;
}

/** Convert parsed CSS nodes to a token of one type, or `undefined` when DTCG has no way to express the value. */
function convertValue(type: TokenType, nodes: ValueNode[], context: Context): Token | undefined {
	switch (type) {
		case "color": {
			const value = toColor(nodes, context);
			return value == null ? undefined : { $type: type, $value: value };
		}
		case "cubicBezier": {
			const value = toCubicBezier(nodes, context);
			return value == null ? undefined : { $type: type, $value: value };
		}
		case "dimension": {
			const value = toDimension(nodes, context);
			return value == null ? undefined : { $type: type, $value: value };
		}
		case "duration": {
			const value = toDuration(nodes, context);
			return value == null ? undefined : { $type: type, $value: value };
		}
		case "fontFamily": {
			const value = toFontFamily(nodes, context);
			return value == null ? undefined : { $type: type, $value: value };
		}
		case "fontWeight": {
			const value = toFontWeight(nodes, context);
			return value == null ? undefined : { $type: type, $value: value };
		}
		case "number": {
			const value = toNumber(nodes, context);
			return value == null ? undefined : { $type: type, $value: value };
		}
		case "shadow": {
			const value = toShadow(nodes, context);
			return value == null ? undefined : { $type: type, $value: value };
		}
	}
}

/** The tokens of one theme, by theme variable name, and the variables with no DTCG form. */
type ConvertedTheme = { tokens: Map<string, Token>; skipped: Map<string, string> };

/**
 * Convert every exported theme variable in one theme's scope. A value that is
 * a bare `var()` of another token of the same type stays an alias; any other
 * `var()` resolves to its value in this theme.
 */
function convertTheme(scope: ReadonlyMap<string, string>): ConvertedTheme {
	const converted = new Map<string, Token | null>();

	const aliasFor = (
		name: string,
		nodes: ValueNode[],
		seen: ReadonlySet<string>,
	): Token | undefined => {
		const [node, ...rest] = nodes;
		const target =
			node?.kind === "function" && node.name === "var" && rest.length === 0
				? wordText(node.children)
				: undefined;
		const source = locate(name);
		const destination = target == null ? undefined : locate(target);
		// Why no `$root` target: the published schema rejects a reference segment that starts with `$`.
		if (
			target == null ||
			source == null ||
			destination == null ||
			destination.namespace.type !== source.namespace.type ||
			destination.path.includes("$root") ||
			tokenFor(target, seen) == null
		) {
			return undefined;
		}
		const alias: Alias = `{${destination.path.join(".")}}`;
		return convertAlias(source.namespace.type, alias);
	};

	const tokenFor = (name: string, seen: ReadonlySet<string>): Token | undefined => {
		const cached = converted.get(name);
		if (cached !== undefined) {
			return cached ?? undefined;
		}
		const location = locate(name);
		const raw = scope.get(name);
		if (location == null || raw == null || seen.has(name)) {
			return undefined;
		}
		const nodes = parseValue(raw);
		const nextSeen = new Set([...seen, name]);
		const token =
			aliasFor(name, nodes, nextSeen) ??
			convertValue(location.namespace.type, nodes, { scope, seen: nextSeen });
		converted.set(name, token ?? null);
		return token;
	};

	const tokens = new Map<string, Token>();
	const skipped = new Map<string, string>();
	for (const [name, raw] of scope) {
		if (locate(name) == null) {
			continue;
		}
		const token = tokenFor(name, new Set());
		if (token == null) {
			skipped.set(name, raw);
		} else {
			tokens.set(name, token);
		}
	}
	return { tokens, skipped };
}

/** Build an alias token of one type. */
function convertAlias(type: TokenType, alias: Alias): Token {
	switch (type) {
		case "color":
			return { $type: type, $value: alias };
		case "cubicBezier":
			return { $type: type, $value: alias };
		case "dimension":
			return { $type: type, $value: alias };
		case "duration":
			return { $type: type, $value: alias };
		case "fontFamily":
			return { $type: type, $value: alias };
		case "fontWeight":
			return { $type: type, $value: alias };
		case "number":
			return { $type: type, $value: alias };
		case "shadow":
			return { $type: type, $value: alias };
	}
}

/** Theme variable values by scope, in cascade order. */
type Declarations = {
	/** The `@theme` blocks, which Tailwind emits in the theme layer. */
	theme: Map<string, string>;
	/** The rules for `:root`, which match in both themes. */
	root: Map<string, string>;
	/** The rules for `:root.dark`, which win over `:root` in the dark theme. */
	dark: Map<string, string>;
};

/** Which scope a top-level node's declarations go to. Nested rules and island-only rules go nowhere. */
function scopeOf(node: ChildNode): keyof Declarations | undefined {
	if (node.type === "atrule") {
		return node.name === "theme" ? "theme" : undefined;
	}
	if (node.type !== "rule") {
		return undefined;
	}
	const selectors = node.selectors.map((selector) => selector.replace(/\s+/g, " ").trim());
	if (selectors.includes(":root.dark")) {
		return "dark";
	}
	return selectors.includes(":root") ? "root" : undefined;
}

/**
 * Collect the custom property declarations of the theme stylesheets. A later
 * declaration of a name replaces the value and keeps the first position.
 */
function collectDeclarations(css: string): Declarations {
	const declarations: Declarations = { theme: new Map(), root: new Map(), dark: new Map() };
	for (const node of parse(css).nodes) {
		const scope = scopeOf(node);
		if (scope == null || !("nodes" in node)) {
			continue;
		}
		for (const child of node.nodes ?? []) {
			// Why: `--color-stone-*: initial` removes a namespace from the theme, as Tailwind does.
			if (child.type === "decl" && child.prop.endsWith("-*") && child.value.trim() === "initial") {
				const prefix = child.prop.slice(0, -1);
				for (const map of Object.values(declarations)) {
					for (const property of map.keys()) {
						if (property.startsWith(prefix)) {
							map.delete(property);
						}
					}
				}
				continue;
			}
			// Why skip `var(--self)`: the `@theme inline` block registers a semantic token by naming itself, and the theme rules set its value.
			if (
				child.type === "decl" &&
				child.prop.startsWith("--") &&
				child.value.trim() !== `var(${child.prop})`
			) {
				declarations[scope].set(child.prop, child.value.trim());
			}
		}
	}
	return declarations;
}

/** Set a value at a path in the token tree. Throws when a token and a group would share a name. */
function insertToken(tree: TokenGroup, path: string[], token: Token): void {
	const name = path.at(-1);
	let group = tree;
	for (const [index, segment] of path.slice(0, -1).entries()) {
		const child = group[segment] ?? {};
		if (!isGroup(child)) {
			throw new Error(
				`design-tokens: "${path.slice(0, index + 1).join(".")}" is both a token and a group`,
			);
		}
		group[segment] = child;
		group = child;
	}
	if (name == null || name in group) {
		throw new Error(`design-tokens: "${path.join(".")}" is both a token and a group`);
	}
	group[name] = token;
}

/** Whether a tree entry is a group, not a token or a `$description` string. */
function isGroup(value: TokenGroup[string]): value is TokenGroup {
	return typeof value === "object" && !("$value" in value) && !(EXTENSION_KEY in value);
}

/** Assemble one token document from converted tokens, in namespace order. */
function toDocument({
	description,
	tokens,
	skipped,
}: {
	description: string;
	tokens: Map<string, Token>;
	skipped: Map<string, string>;
}): TokenGroup {
	const document: TokenGroup = { $schema: FORMAT_SCHEMA, $description: description };
	if (skipped.size > 0) {
		document.$extensions = { [EXTENSION_KEY]: { skipped: Object.fromEntries(skipped) } };
	}
	for (const namespace of NAMESPACES) {
		for (const [name, token] of tokens) {
			const location = locate(name);
			if (location?.namespace !== namespace) {
				continue;
			}
			if (!namespace.single && !(namespace.group in document)) {
				document[namespace.group] = { $description: namespace.description };
			}
			insertToken(
				document,
				location.path,
				namespace.single ? { ...token, $description: namespace.description } : token,
			);
		}
	}
	return document;
}

const RESOLVER: ResolverDocument = {
	$schema: RESOLVER_SCHEMA,
	name: "@ngrok/mantle",
	version: "2025.10",
	description: "The design tokens of @ngrok/mantle with a light theme and a dark theme.",
	sets: { mantle: { sources: [{ $ref: TOKEN_FILE_NAMES.tokens }] } },
	modifiers: {
		theme: {
			description: "The color theme. The light theme is the base set as it is.",
			contexts: { light: [], dark: [{ $ref: TOKEN_FILE_NAMES.dark }] },
			default: "light",
		},
	},
	resolutionOrder: [{ $ref: "#/sets/mantle" }, { $ref: "#/modifiers/theme" }],
};

/**
 * Build mantle's DTCG token documents from its theme stylesheets: Tailwind's
 * `theme.css` followed by `mantle.css`, in cascade order. `tokens` holds every
 * token with its light value. `darkTokens` holds only the tokens that the dark
 * theme changes, and `resolver` applies them over `tokens`.
 *
 * @example
 * const { tokens, darkTokens } = buildDesignTokens(
 * 	"@theme { --color-sky-500: oklch(68.5% 0.169 237.323); --color-accent-500: var(--color-sky-500); }" +
 * 		":root.dark { --color-sky-500: oklch(58.8% 0.158 241.966); }",
 * );
 * // tokens.color.accent["500"] => { $type: "color", $value: "{color.sky.500}" }
 * // darkTokens.color.sky["500"].$value.components => [0.588, 0.158, 241.966]
 */
function buildDesignTokens(css: string): DesignTokenFiles {
	const declarations = collectDeclarations(css);
	const lightScope = new Map([...declarations.theme, ...declarations.root]);
	const darkScope = new Map([...lightScope, ...declarations.dark]);
	const light = convertTheme(lightScope);
	const dark = convertTheme(darkScope);

	const changedTokens = new Map(
		[...dark.tokens].filter(
			([name, token]) => JSON.stringify(token) !== JSON.stringify(light.tokens.get(name)),
		),
	);
	const changedSkipped = new Map(
		[...dark.skipped].filter(([name, raw]) => raw !== light.skipped.get(name)),
	);

	return {
		tokens: toDocument({
			description: `The design tokens of @ngrok/mantle with light theme values. A token path joined with "-" names its Tailwind theme variable: color.sky.500 is --color-sky-500, and a $root segment drops out. ${TOKEN_FILE_NAMES.dark} holds the dark theme changes, and ${TOKEN_FILE_NAMES.resolver} applies them. $extensions lists the theme variables that have no DTCG type, with their CSS values.`,
			tokens: light.tokens,
			skipped: light.skipped,
		}),
		darkTokens: toDocument({
			description: `The tokens of @ngrok/mantle that change in the dark theme. Apply them over ${TOKEN_FILE_NAMES.tokens}.`,
			tokens: changedTokens,
			skipped: changedSkipped,
		}),
		resolver: RESOLVER,
	};
}

export {
	//,
	buildDesignTokens,
	parseValue,
	TOKEN_FILE_NAMES,
	type DesignTokenFiles,
	type Token,
	type TokenGroup,
};
