import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { RadioGroup } from "./radio-group.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities that set a segment's size.
 * Browser tests load no Tailwind, so without these rules the layout is degenerate.
 */
const STYLE = `
@layer utilities {
	.flex { display: flex; }
	.flex-1 { flex: 1; }
	.flex-nowrap { flex-wrap: nowrap; }
	.items-center { align-items: center; }
	.h-9 { height: 36px; }
	.px-3 { padding-inline: 12px; }
	.whitespace-nowrap { white-space: nowrap; }
}
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

describe("RadioGroup.Button", () => {
	test("a long label stays on one line inside its segment", () => {
		render(
			<div style={{ width: 240, font: "14px/20px sans-serif" }}>
				<RadioGroup.ButtonGroup aria-label="Window" defaultValue="hour">
					<RadioGroup.Button value="hour">1h</RadioGroup.Button>
					<RadioGroup.Button value="week">Requests per second over the last week</RadioGroup.Button>
				</RadioGroup.ButtonGroup>
			</div>,
		);

		const segment = screen.getByRole("radio", { name: /last week/ });
		expect(segment.scrollHeight).toBeLessThanOrEqual(segment.clientHeight);
		expect(segment.scrollWidth).toBeLessThanOrEqual(segment.clientWidth);
	});
});
