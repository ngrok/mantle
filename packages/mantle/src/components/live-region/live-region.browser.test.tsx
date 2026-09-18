import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, expect, test } from "vitest";
import { LiveRegion } from "./live-region.js";

// Why inline CSS: the browser project loads no Tailwind, so the hiding contract
// is observable only with Tailwind's own `.sr-only` rule copied here verbatim.
const STYLE = `
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border-width: 0;
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

test("hides the region from sight as a 1px absolute box, not from the accessibility tree", () => {
	render(<LiveRegion>Draft saved</LiveRegion>);
	// Why getByRole: it skips an element that `display: none`, `visibility: hidden`,
	// or `aria-hidden` removes from the tree, so a match pins the tree half of the contract.
	const style = getComputedStyle(screen.getByRole("status"));
	expect(style.position).toBe("absolute");
	expect(style.width).toBe("1px");
	expect(style.height).toBe("1px");
});
