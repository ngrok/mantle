import { describe, expect, it } from "vitest";

import { buildDesignTokens, type TokenGroup } from "./design-tokens.ts";
import { readThemeCss } from "./write-design-tokens.ts";

/** Read the entry at a dotted path, such as `color.sky.500`. */
function at(document: TokenGroup, path: string): unknown {
	let node: unknown = document;
	for (const segment of path.split(".")) {
		node = typeof node === "object" && node != null ? Reflect.get(node, segment) : undefined;
	}
	return node;
}

/** The value of the token at a dotted path in the light document. */
function lightValue(css: string, path: string): unknown {
	return Reflect.get(Object(at(buildDesignTokens(css).tokens, path)), "$value");
}

describe("buildDesignTokens", () => {
	it("keeps a bare var() of a token of the same type as an alias", () => {
		const css = `@theme {
			--color-sky-500: oklch(68.5% 0.169 237.323);
			--color-accent-500: var(--color-sky-500);
		}`;

		expect(at(buildDesignTokens(css).tokens, "color.accent.500")).toEqual({
			$type: "color",
			$value: "{color.sky.500}",
		});
	});

	it("resolves a var() of a variable that is not a token to its value", () => {
		const css = ":root { --gap: 1rem; } @theme { --radius-lg: var(--gap); }";

		expect(lightValue(css, "radius.lg")).toEqual({ value: 1, unit: "rem" });
	});

	it("applies the alpha of --alpha() to the color it references", () => {
		const css = `@theme { --color-neutral-950: oklch(18.2% 0 0); }
			:root { --text-color-body: --alpha(var(--color-neutral-950) / 0.75); }`;

		expect(lightValue(css, "text-color.body")).toEqual({
			colorSpace: "oklch",
			components: [0.182, 0, 0],
			alpha: 0.75,
		});
	});

	it.each([
		["#000", { colorSpace: "srgb", components: [0, 0, 0], hex: "#000000" }],
		[
			"rgb(0 0 0 / 0.05)",
			{ colorSpace: "srgb", components: [0, 0, 0], alpha: 0.05, hex: "#000000" },
		],
		[
			"color(display-p3 0.94164 0 0.99869)",
			{ colorSpace: "display-p3", components: [0.94164, 0, 0.99869] },
		],
		["oklch(98.5% 0 none)", { colorSpace: "oklch", components: [0.985, 0, "none"] }],
	])("converts the color %s", (value, expected) => {
		expect(lightValue(`@theme { --color-test: ${value}; }`, "color.test")).toEqual(expected);
	});

	it("mixes two OKLCH colors in OKLab for color-mix()", () => {
		// The hue of 90 degrees puts all the chroma on the b axis.
		const css = `@theme { --color-white: oklch(1 0 0); --color-tint: oklch(0.6 0.2 90); }
			:root { --background-color-card-hover: color-mix(in oklab, var(--color-white) 50%, var(--color-tint)); }`;

		expect(lightValue(css, "background-color.card-hover")).toEqual({
			colorSpace: "oklab",
			components: [0.8, 0, 0.1],
		});
	});

	it("converts each layer of a shadow list, with the inset keyword and the default blur and spread", () => {
		const css = "@theme { --shadow-test: inset 0 2px 4px 0 #000, 0 1px #fff; }";

		expect(lightValue(css, "shadow.test")).toEqual([
			{
				color: { colorSpace: "srgb", components: [0, 0, 0], hex: "#000000" },
				offsetX: { value: 0, unit: "px" },
				offsetY: { value: 2, unit: "px" },
				blur: { value: 4, unit: "px" },
				spread: { value: 0, unit: "px" },
				inset: true,
			},
			{
				color: { colorSpace: "srgb", components: [1, 1, 1], hex: "#ffffff" },
				offsetX: { value: 0, unit: "px" },
				offsetY: { value: 1, unit: "px" },
				blur: { value: 0, unit: "px" },
				spread: { value: 0, unit: "px" },
			},
		]);
	});

	it("keeps an integer above 2^24 exact", () => {
		// A 32-bit float parser, such as lightningcss, writes 2147483648 here.
		expect(lightValue("@theme { --z-index-max: 2147483647; }", "z-index.max")).toBe(2147483647);
	});

	it("lists a value with no DTCG form in $extensions instead of the tree", () => {
		const css =
			"@theme { --text-sm: 0.875rem; --text-lg: clamp(1rem, 1vw, 2rem); --spacing-em: 1em; }";
		const { tokens } = buildDesignTokens(css);

		expect(at(tokens, "text.lg")).toBeUndefined();
		expect(at(tokens, "$extensions")).toEqual({
			"com.ngrok.mantle": {
				skipped: { "--text-lg": "clamp(1rem, 1vw, 2rem)", "--spacing-em": "1em" },
			},
		});
	});

	it("ignores an @theme inline declaration that names itself", () => {
		const css = `@theme inline { --background-color-card: var(--background-color-card); }
			:root { --background-color-card: #fff; }`;

		expect(lightValue(css, "background-color.card")).toEqual({
			colorSpace: "srgb",
			components: [1, 1, 1],
			hex: "#ffffff",
		});
	});

	it("puts only the tokens the dark theme changes in darkTokens, with the values that derive from them", () => {
		const css = `@theme { --color-neutral-950: oklch(18.2% 0 0); --color-sky-500: oklch(68.5% 0.169 237.323); }
			:root { --text-color-muted: --alpha(var(--color-neutral-950) / 0.6); }
			:root.dark { --color-neutral-950: oklch(98.5% 0 0); }`;
		const { darkTokens } = buildDesignTokens(css);

		expect(at(darkTokens, "color.neutral.950")).toEqual({
			$type: "color",
			$value: { colorSpace: "oklch", components: [0.985, 0, 0] },
		});
		expect(at(darkTokens, "text-color.muted")).toEqual({
			$type: "color",
			$value: { colorSpace: "oklch", components: [0.985, 0, 0], alpha: 0.6 },
		});
		expect(at(darkTokens, "color.sky")).toBeUndefined();
	});

	it("throws when a token and a group share a path", () => {
		const css = "@theme { --color-sky-500: #000; --color-sky: #fff; }";

		expect(() => buildDesignTokens(css)).toThrow('"color.sky" is both a token and a group');
	});
});

/** Every token in a document by dotted path. A group holds only `$`-prefixed properties, tokens, and groups. */
function tokensOf(
	group: TokenGroup,
	prefix: string[] = [],
): Map<string, { $type: unknown; $value: unknown }> {
	const tokens = new Map<string, { $type: unknown; $value: unknown }>();
	for (const [name, node] of Object.entries(group)) {
		if (name.startsWith("$") && name !== "$root") {
			continue;
		}
		const path = [...prefix, name];
		if (typeof node !== "object") {
			throw new Error(`${path.join(".")} is not a token or a group`);
		}
		if ("$value" in node) {
			tokens.set(path.join("."), { $type: node.$type, $value: node.$value });
		} else {
			for (const [childPath, token] of tokensOf(node, path)) {
				tokens.set(childPath, token);
			}
		}
	}
	return tokens;
}

describe("buildDesignTokens on mantle.css", () => {
	const { tokens, darkTokens, resolver } = buildDesignTokens(readThemeCss());
	const light = tokensOf(tokens);
	const dark = new Map([...light, ...tokensOf(darkTokens)]);

	it("gives every token a $value and a $type", () => {
		for (const [path, token] of [...light, ...tokensOf(darkTokens)]) {
			expect({ path, value: token.$value != null, type: typeof token.$type }).toEqual({
				path,
				value: true,
				type: "string",
			});
		}
	});

	it("points every alias at a token of the same type in both themes", () => {
		const aliases = [light, dark].flatMap((theme) =>
			[...theme].flatMap(([path, token]) => {
				const target =
					typeof token.$value === "string" ? /^\{(.+)\}$/.exec(token.$value)?.[1] : undefined;
				return target == null ? [] : [{ path, matches: theme.get(target)?.$type === token.$type }];
			}),
		);

		expect(aliases.length).toBeGreaterThan(0);
		expect(aliases.filter(({ matches }) => !matches)).toEqual([]);
	});

	it("covers each published group", () => {
		const groups = Object.keys(tokens).filter((name) => !name.startsWith("$"));

		expect(groups).toEqual([
			"color",
			"background-color",
			"border-color",
			"divide-color",
			"ring-color",
			"text-color",
			"font",
			"font-weight",
			"text",
			"spacing",
			"radius",
			"shadow",
			"z-index",
			"breakpoint",
			"container",
			"ease",
			"default-transition-duration",
			"default-transition-timing-function",
		]);
	});

	it("names the published dark file in the resolver's dark context", () => {
		expect(resolver.modifiers.theme?.contexts.dark).toEqual([{ $ref: "tokens.dark.json" }]);
		expect(tokensOf(darkTokens).size).toBeGreaterThan(0);
	});
});
