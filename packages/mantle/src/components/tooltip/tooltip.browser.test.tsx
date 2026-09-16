import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Tooltip, TooltipProvider } from "./tooltip.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities this test reads. Inlined so
 * the test stays hermetic and needs no Tailwind build step: a browser test loads
 * no stylesheet, so without this the wrapper would report its initial `display`
 * and the assertion would pass for the wrong reason.
 */
const TOOLTIP_LAYOUT_STYLE = `
@layer utilities {
	.contents { display: contents; }
}
`;

describe("Tooltip.Content label slot (browser)", () => {
	let styleElement: HTMLStyleElement;

	beforeAll(() => {
		styleElement = document.createElement("style");
		styleElement.textContent = TOOLTIP_LAYOUT_STYLE;
		document.head.appendChild(styleElement);
	});

	afterAll(() => {
		styleElement.remove();
	});

	test("the label div generates no box, so a body element stays a child of the surface", async () => {
		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<Tooltip.Root>
					<Tooltip.Trigger>Hover me</Tooltip.Trigger>
					<Tooltip.Content>
						<p>This feature is part of your plan</p>
					</Tooltip.Content>
				</Tooltip.Root>
			</TooltipProvider>,
		);

		await user.hover(screen.getByRole("button", { name: "Hover me" }));
		const tooltip = await screen.findByRole("tooltip");
		const label = tooltip.querySelector('[data-slot="tooltip-label"]');
		if (label == null) {
			throw new Error('No element carries data-slot="tooltip-label".');
		}

		expect(getComputedStyle(label).display).toBe("contents");
		expect(label.getClientRects()).toHaveLength(0);
		// A `<div>` may legally hold the `<p>` the documented example passes.
		expect(label.tagName).toBe("DIV");
		expect(screen.getByText("This feature is part of your plan").tagName).toBe("P");
	});
});
