import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, expect, test } from "vitest";
import { commands } from "vitest/browser";
import * as Typography from "./typography-parts.js";

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet, so a heading has no wrap rule.
beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = await commands.tailwindCss("./typography.tsx");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

test.each([
	["heading", Typography.H1],
	["paragraph", Typography.P],
])("a %s with one long word wraps inside a narrow flex parent", (_, Part) => {
	render(
		<div style={{ display: "flex", width: 120 }}>
			<Part data-testid="part">SandboxedOnClickProvider</Part>
		</div>,
	);
	expect(screen.getByTestId("part").getBoundingClientRect().width).toBeLessThanOrEqual(120);
});
