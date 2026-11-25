import { render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
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
