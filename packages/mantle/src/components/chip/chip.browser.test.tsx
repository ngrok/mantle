import { render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
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
			"0.15s",
		);
	});

	test("a selectable chip changes without a transition under reduced motion", async () => {
		await commands.emulateMedia({ reducedMotion: "reduce" });
		render(<Chip selectable>Read</Chip>);

		expect(getComputedStyle(screen.getByRole("button", { name: "Read" })).transitionDuration).toBe(
			"0s",
		);
	});
});
