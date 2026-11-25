import { render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, onTestFinished, test } from "vitest";
import { commands, userEvent } from "vitest/browser";
import preflightCss from "tailwindcss/preflight.css?raw";
import { Chip } from "./chip.js";

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet, and reduced
// motion must be checked against the utilities this component actually ships.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = await commands.tailwindCss("./chip.tsx");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

afterEach(async () => {
	await commands.emulateMedia({ reducedMotion: "no-preference" });
});

describe("Chip motion", () => {
	test("a selectable chip transitions when motion is allowed", async () => {
		await commands.emulateMedia({ reducedMotion: "no-preference" });
		render(<Chip selectable>Read</Chip>);

		expect(getComputedStyle(screen.getByRole("button", { name: "Read" })).transitionDuration).toBe(
			"0.2s",
		);
		expect(
			getComputedStyle(screen.getByRole("button", { name: "Read" })).transitionTimingFunction,
		).toBe("cubic-bezier(0.23, 1, 0.32, 1)");
	});

	test("a selectable chip changes without a transition under reduced motion", async () => {
		await commands.emulateMedia({ reducedMotion: "reduce" });
		render(<Chip selectable>Read</Chip>);

		expect(getComputedStyle(screen.getByRole("button", { name: "Read" })).transitionDuration).toBe(
			"0s",
		);
	});
});

describe("Chip size", () => {
	test("a pill chip is as tall as a Button of the same size", () => {
		// Why preflight: apps load it, and its border-box sizing sets the rendered height.
		const preflight = document.createElement("style");
		preflight.textContent = preflightCss;
		document.head.prepend(preflight);
		try {
			const sizes = ["xs", "sm", "md", "lg", "xl"] as const;
			render(
				<>
					{sizes.map((size) => (
						<Chip key={size} selectable size={size}>
							{size}
						</Chip>
					))}
				</>,
			);
			expect(
				sizes.map(
					(size) => screen.getByRole("button", { name: size }).getBoundingClientRect().height,
				),
			).toEqual([24, 28, 36, 40, 48]);
		} finally {
			preflight.remove();
		}
	});
});

/** One color as sRGB channels from 0 to 255 and an alpha from 0 to 1, read through a canvas. */
function readColor(css: string): [number, number, number, number] {
	const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
	if (context == null) {
		throw new Error("Expected a 2D canvas context");
	}
	context.fillStyle = css;
	context.fillRect(0, 0, 1, 1);
	const [red = 0, green = 0, blue = 0, alpha = 0] = context.getImageData(0, 0, 1, 1).data;
	return [red, green, blue, alpha / 255];
}

/** Paints `top` over an opaque `bottom`. */
function over(
	top: [number, number, number, number],
	bottom: [number, number, number, number],
): [number, number, number, number] {
	const [red, green, blue, alpha] = top;
	return [
		red * alpha + bottom[0] * (1 - alpha),
		green * alpha + bottom[1] * (1 - alpha),
		blue * alpha + bottom[2] * (1 - alpha),
		1,
	];
}

/** The WCAG 2 contrast ratio of two opaque colors. */
function contrast(first: number[], second: number[]): number {
	const luminance = (color: number[]) =>
		color
			.slice(0, 3)
			.map((channel) => channel / 255)
			.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
			.reduce((sum, channel, index) => sum + channel * ([0.2126, 0.7152, 0.0722][index] ?? 0), 0);
	const [light, dark] = [luminance(first), luminance(second)].toSorted((a, b) => b - a);
	return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

/** The contrast of `foreground`'s color over the layers behind it, up to `surface`. */
function contrastOf(foreground: HTMLElement, surface: HTMLElement): number {
	const layers: Array<[number, number, number, number]> = [];
	for (let node: HTMLElement | null = foreground; node != null; node = node.parentElement) {
		layers.unshift(readColor(getComputedStyle(node).backgroundColor));
		if (node === surface) {
			break;
		}
	}
	const backdrop = layers.reduce((below, layer) => over(layer, below), [255, 255, 255, 1]);
	return contrast(over(readColor(getComputedStyle(foreground).color), backdrop), backdrop);
}

describe("Chip contrast", () => {
	// Why every theme and surface: WCAG 2.2 asks 4.5:1 for text (1.4.3) and 3:1 for a control's icon (1.4.11).
	test.each([
		["light", "bg-base"],
		["light", "bg-card"],
		["dark", "bg-base"],
		["dark", "bg-card"],
	] as const)("%s theme on %s meets WCAG contrast", async (theme, surfaceClass) => {
		const mantleStyle = document.createElement("style");
		const css = await Promise.all(
			["./chip.tsx", "./chip.browser.test.tsx"].map((file) =>
				commands.tailwindCss(file, { mantleCss: true }),
			),
		);
		mantleStyle.textContent = css.join("\n");
		styleElement.media = "not all";
		document.head.append(mantleStyle);
		document.documentElement.classList.add(theme);
		await commands.emulateMedia({ reducedMotion: "reduce" });
		try {
			render(
				<div data-testid="surface" className={surfaceClass}>
					<Chip selectable defaultPressed>
						Read
					</Chip>
					<Chip onRemove={() => {}} removeLabel="Remove Write">
						Write
					</Chip>
					<Chip appearance="square" size="sm" onRemove={() => {}} removeLabel="Remove Manage">
						Manage
					</Chip>
				</div>,
			);
			const surface = screen.getByTestId("surface");
			// Why: with no theme CSS, default black on white would pass every threshold.
			expect(readColor(getComputedStyle(surface).backgroundColor)[3]).toBe(1);
			expect(
				readColor(
					getComputedStyle(screen.getByRole("button", { name: "Read" })).backgroundColor,
				)[3],
			).toBeGreaterThan(0);
			const pressed = screen.getByRole("button", { name: "Read" });
			const glyphs = ["Remove Write", "Remove Manage"].map((name) =>
				screen.getByRole("button", { name }),
			);
			expect(contrastOf(pressed, surface)).toBeGreaterThanOrEqual(4.5);
			for (const glyph of glyphs) {
				expect(contrastOf(glyph, surface)).toBeGreaterThanOrEqual(3);
			}
			await userEvent.hover(pressed);
			expect(contrastOf(pressed, surface)).toBeGreaterThanOrEqual(4.5);
		} finally {
			document.documentElement.classList.remove(theme);
			mantleStyle.remove();
			styleElement.media = "";
		}
	});
});

describe("Chip width", () => {
	test("a long pill stays inside a 320px row beside a sibling and truncates its label", async () => {
		const longLabel = "Production API credentials for the primary billing account";
		// Why preflight: apps load it, and `max-w-full` counts the padding only in border-box sizing.
		const preflight = document.createElement("style");
		preflight.textContent = preflightCss;
		document.head.prepend(preflight);
		onTestFinished(() => preflight.remove());
		// Why a fixed sibling: a pill must shrink into the space left after it, not only cap at the row width.
		const row = { display: "flex", gap: 8, width: 320 } as const;
		const sibling = <span style={{ flex: "0 0 64px" }} />;
		render(
			<>
				<div data-testid="row" style={row}>
					{sibling}
					<Chip selectable>{longLabel}</Chip>
				</div>
				<div data-testid="row" style={row}>
					{sibling}
					<Chip onRemove={() => {}} removeLabel="Remove billing">
						{longLabel}
					</Chip>
				</div>
			</>,
		);
		expect(screen.getByRole("button", { name: "Remove billing" }).clientWidth).toBeGreaterThan(0);
		for (const row of screen.getAllByTestId("row")) {
			const right = row.getBoundingClientRect().right;
			const parts = row.querySelectorAll(
				"[data-slot~=chip], [data-slot=chip-label] > span, [data-slot=chip-remove]",
			);
			for (const part of parts) {
				expect(part.getBoundingClientRect().right).toBeLessThanOrEqual(right);
			}
			const label = row.querySelector<HTMLElement>("[data-slot=chip-label] > span");
			expect(label && getComputedStyle(label).textOverflow).toBe("ellipsis");
			expect(label && label.scrollWidth > label.clientWidth).toBe(true);
		}
	});
});

describe("Chip aria-disabled", () => {
	test("an aria-disabled chip looks like a disabled chip", () => {
		render(
			<>
				<Chip selectable disabled>
					Native
				</Chip>
				<Chip selectable aria-disabled="true">
					Selectable
				</Chip>
				<Chip data-testid="removable" aria-disabled="true" onRemove={() => {}} removeLabel="Remove">
					Removable
				</Chip>
			</>,
		);
		const native = getComputedStyle(screen.getByRole("button", { name: "Native" }));
		const selectable = getComputedStyle(screen.getByRole("button", { name: "Selectable" }));
		expect([selectable.opacity, selectable.cursor]).toEqual([native.opacity, native.cursor]);
		expect(getComputedStyle(screen.getByTestId("removable")).opacity).toBe(native.opacity);
		expect(getComputedStyle(screen.getByRole("button", { name: "Remove" })).cursor).toBe("default");
	});
});
