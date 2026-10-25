import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Separator } from "./separator.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities this test depends on. We
 * inline it instead of importing the mantle stylesheet so the test stays
 * hermetic and needs no Tailwind build step.
 */
const STYLE = `
@layer utilities {
	.shrink-0 { flex-shrink: 0; }
	.h-px { height: 1px; }
	.w-full { width: 100%; }
}
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.append(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

describe("Separator", () => {
	test("keeps its 1px height in a flex column that overflows", () => {
		render(
			<div style={{ display: "flex", flexDirection: "column", height: 100 }}>
				<div style={{ height: 200 }} />
				<Separator data-testid="separator" />
			</div>,
		);

		expect(screen.getByTestId("separator").getBoundingClientRect().height).toBe(1);
	});
});
