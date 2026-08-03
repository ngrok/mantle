import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import twThemeCss from "tailwindcss/theme.css?raw";
import { BarChart } from "../bar-chart/index.js";
import { Empty } from "../empty/index.js";
import darkHighContrastCss from "../../mantle-dark-high-contrast.css?raw";
import darkCss from "../../mantle-dark.css?raw";
import lightHighContrastCss from "../../mantle-light-high-contrast.css?raw";
import lightCss from "../../mantle.css?raw";
import { contrastRatio, hexFromOklch, layer, resolveProperty } from "./palette-gates.js";
import type { ThemeName } from "./palette-gates.js";

/**
 * An empty-state message over a recessed decorative chart must stay readable.
 *
 * A `decorative` chart is the backdrop behind that message, so the message's
 * background is not the card surface — it is a chart mark composited over the
 * surface at the recession's opacity. This test resolves each theme's eight
 * chart slots and text ramp down to the 8-bit colors a browser rasterizes,
 * composites them the way a browser does, and measures the text against what
 * actually sits behind it.
 *
 * **Both halves of the pair are read off rendered components, not re-declared
 * here.** The recession's opacity comes off a rendered decorative chart, and
 * the scrim's surface off a rendered `Empty.Scrim`. Re-tuning either one
 * re-measures every theme at the new value, which is the point: the recession,
 * the scrim, and the contrast floor are one decision spread across two files.
 *
 * **The scrim is load-bearing, and the docs say so.** `Empty.Description` sits
 * on `text-muted`, which measures 4.88:1 on a bare light card — 0.38 over the
 * AA floor. A mark under that text spends the headroom, so the bare recession
 * leaves the worst slot at 2.74:1. `Empty.Scrim` repaints the surface locally
 * and hands the message back the contrast it would have on a flat card. The
 * third test pins that gap, so nobody drops the scrim from the docs
 * composition believing the recession alone carries it.
 *
 * **Blur moves no number here.** Under the middle of a mark it leaves the
 * color where it was, so only the opacity and the scrim carry contrast.
 *
 * When this fails, re-step the palette slot, the recession, or the scrim.
 * Never widen `CONTRAST_FLOOR`.
 *
 * @see decisions/2026-07-18-canvas-chart-family.md
 */

/** WCAG AA for normal-size text. The message renders at 14px. */
const CONTRAST_FLOOR = 4.5;

const CHART_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const rgbOf = (hex: string) =>
	[1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));

const hexOfRgb = (channels: readonly number[]) =>
	`#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

/** Composite `src` over `dst` at `alpha`, the way a browser blends sRGB. */
const over = (src: string, dst: string, alpha: number) => {
	const source = rgbOf(src);
	const destination = rgbOf(dst);
	return hexOfRgb(
		source.map((channel, index) => alpha * channel + (1 - alpha) * (destination[index] ?? 0)),
	);
};

/** A text token: its base color, and the alpha it composites at. */
type TextColor = { color: string; alpha: number };

type Theme = {
	name: ThemeName;
	surface: string;
	slots: string[];
	strong: TextColor;
	muted: TextColor;
	/** The surface `Empty.Scrim` repaints behind the copy. */
	scrim: string;
};

/**
 * The surface `Empty.Scrim` repaints, read off the rendered part so this file
 * cannot drift from `empty.tsx`. The class carries the CSS variable and its
 * fallback; the fallback is what a consumer observes when nothing sets the
 * variable.
 */
const shippedScrimSurface = (): string => {
	const { container } = render(<Empty.Scrim />);
	const scrim = container.querySelector('[data-slot="empty-scrim"]');
	const match = scrim?.className.match(/var\(--empty-scrim-color,\s*var\((--[a-z-]+)\)\)/);
	if (match?.[1] == null) {
		throw new Error(
			`Empty.Scrim no longer reads --empty-scrim-color with a surface fallback: ${scrim?.className ?? "no scrim"}`,
		);
	}
	return match[1];
};

const resolveTheme = (name: ThemeName, themeCss: string, themeFile: string): Theme => {
	const chain =
		themeFile === "mantle.css"
			? [layer("mantle.css", lightCss), layer("tailwindcss/theme.css", twThemeCss)]
			: [
					layer(themeFile, themeCss),
					layer("mantle.css", lightCss),
					layer("tailwindcss/theme.css", twThemeCss),
				];

	const hexOf = (property: string) => hexFromOklch(resolveProperty(chain, property).literal);

	/**
	 * The text ramp authors `--alpha(<color> / <a>)`, which `resolveProperty`
	 * refuses as neither an alias nor a literal, so read the raw declaration and
	 * unwrap the alpha here.
	 */
	const textColorOf = (property: string): TextColor => {
		const declaration = chain.find((sheet) => sheet.declarations.has(property));
		const raw = declaration?.declarations.get(property);
		if (raw == null) {
			throw new Error(`${name}: no declaration for ${property}`);
		}
		const alphaMatch = raw.match(/^--alpha\((.+) \/ ([\d.]+)\)$/);
		const literal = alphaMatch?.[1] ?? raw;
		const alpha = Number(alphaMatch?.[2] ?? 1);
		if (literal.startsWith("#")) {
			const expanded =
				literal.length === 4
					? `#${literal[1]}${literal[1]}${literal[2]}${literal[2]}${literal[3]}${literal[3]}`
					: literal;
			return { color: expanded, alpha };
		}
		const inner = literal.startsWith("var(") ? literal.slice(4, -1).trim() : literal;
		return { color: hexOf(inner), alpha };
	};

	return {
		name,
		surface: hexOf("--background-color-card"),
		slots: CHART_SLOTS.map((slot) => hexOf(`--color-chart-${slot}`)),
		strong: textColorOf("--text-color-strong"),
		muted: textColorOf("--text-color-muted"),
		scrim: hexOf(shippedScrimSurface()),
	};
};

const THEMES: Theme[] = [
	resolveTheme("light", lightCss, "mantle.css"),
	resolveTheme("dark", darkCss, "mantle-dark.css"),
	resolveTheme("light-high-contrast", lightHighContrastCss, "mantle-light-high-contrast.css"),
	resolveTheme("dark-high-contrast", darkHighContrastCss, "mantle-dark-high-contrast.css"),
];

/**
 * The opacity a decorative chart actually ships, read off the rendered root so
 * this file cannot drift from `primitive.tsx`.
 */
const shippedRecessionAlpha = (): number => {
	const { container } = render(
		<BarChart.Root data={[{ month: "January", desktop: 1 }]} xKey="month" decorative>
			<BarChart.Bar dataKey="desktop" />
		</BarChart.Root>,
	);
	const root = container.querySelector('[data-slot="bar-chart"]');
	const match = root?.className.match(/(?:^|\s)opacity-(\d+)(?:\s|$)/);
	if (match?.[1] == null) {
		throw new Error(
			`a decorative chart no longer carries an opacity-* class: ${root?.className ?? "no root"}`,
		);
	}
	return Number(match[1]) / 100;
};

describe("empty-state text over a recessed decorative chart", () => {
	test("the recession's opacity is the one the chart ships", () => {
		// Pins the pair: every measurement below is only meaningful at the shipped
		// value, and a recession with no opacity at all would silently measure 1.
		expect(shippedRecessionAlpha()).toBe(0.7);
	});

	test("the scrim repaints the surface the contrast math assumes, at full opacity", () => {
		// Two premises, and the measurements below rest on both. The surface token
		// decides what the copy is measured against, so pointing the fallback at
		// another token silently changes every ratio. The missing alpha modifier is
		// why no chart color reaches the copy at all: give the background one and
		// the recessed marks blend back under the text, which is exactly the case
		// the scrim tests stop measuring.
		expect(shippedScrimSurface()).toBe("--background-color-card");
		const { container } = render(<Empty.Scrim />);
		const scrim = container.querySelector('[data-slot="empty-scrim"]');
		expect(scrim?.className).toMatch(
			/(?:^|\s)bg-\[var\(--empty-scrim-color,var\(--background-color-card\)\)\](?:\s|$)/,
		);
	});

	test("the bare recession is not enough on its own, which is why Empty.Scrim exists", () => {
		// Pins the gap the scrim closes. If a future recession is deep enough that
		// every slot clears the floor unaided, this goes red — and the docs, the
		// JSDoc, and the examples all claim the scrim is required, so they have to
		// change together with it.
		const alpha = shippedRecessionAlpha();
		const worst = THEMES.flatMap((theme) =>
			theme.slots.map((mark, index) => {
				const backdrop = over(mark, theme.surface, alpha);
				return {
					where: `${theme.name} chart-${index + 1}`,
					ratio: contrastRatio(over(theme.muted.color, backdrop, theme.muted.alpha), backdrop),
				};
			}),
		).reduce((lowest, row) => (row.ratio < lowest.ratio ? row : lowest));
		expect(
			worst.ratio,
			`the worst bare pairing is ${worst.where}, and it must still need the scrim`,
		).toBeLessThan(CONTRAST_FLOOR);
	});

	test.each(THEMES.map((theme) => [theme.name, theme] as const))(
		"%s: Empty over the scrim clears AA",
		(_name, theme) => {
			// No chart slot appears in this math, and that is the whole point of the
			// scrim: its core is opaque across the copy, so no recessed mark reaches
			// the text and the backdrop is the scrim surface alone. Looping the eight
			// slots here would assert one identical pairing eight times and read as
			// per-slot coverage the measurement cannot have. The per-slot work is the
			// bare-recession test above, where the mark does reach the text.
			const measure = (text: TextColor) =>
				contrastRatio(over(text.color, theme.scrim, text.alpha), theme.scrim);
			expect(
				measure(theme.strong),
				`${theme.name}: Empty.Title (text-strong) over the scrim`,
			).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
			expect(
				measure(theme.muted),
				`${theme.name}: Empty.Description (text-muted) over the scrim`,
			).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
		},
	);
});
