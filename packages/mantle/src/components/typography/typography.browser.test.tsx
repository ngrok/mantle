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

test("a heading with one long word wraps inside a narrow flex parent", () => {
	render(
		<div style={{ display: "flex", width: 120 }}>
			<Typography.H1>SandboxedOnClickProvider</Typography.H1>
		</div>,
	);
	const heading = screen.getByRole("heading", { level: 1 });
	expect(heading.getBoundingClientRect().width).toBeLessThanOrEqual(120);
});
