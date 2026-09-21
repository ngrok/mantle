import { render } from "@testing-library/react";
import { afterAll, beforeAll, expect, test } from "vitest";
import { Badge } from "./badge.js";

// Why inline CSS: the browser project loads no Tailwind, so the label slot's
// `contents` utility is a bare class until this rule defines it.
const STYLE = `
@layer utilities {
	.contents { display: contents; }
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

test("lays out the label slot as contents, so it adds no box of its own", () => {
	render(
		<Badge appearance="muted" color="success">
			Succeeded
		</Badge>,
	);

	const label = document.querySelector('[data-slot="badge-label"]');
	if (label == null) {
		throw new Error('No element carries data-slot="badge-label".');
	}

	// The slot generates no box, so every child stays a flex item of the badge
	// and the badge's `gap` still falls between them.
	expect(label).toHaveTextContent("Succeeded");
	expect(getComputedStyle(label).display).toBe("contents");
	expect(label.getClientRects()).toHaveLength(0);
});
