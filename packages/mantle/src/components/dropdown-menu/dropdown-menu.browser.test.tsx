import { render } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { DropdownMenu } from "./dropdown-menu.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the one utility every item's label span
 * carries. Inlined so the test stays hermetic and needs no Tailwind build step:
 * a browser test loads no stylesheet, so without this the wrapper would report
 * its initial `display` and the assertion would pass for the wrong reason.
 */
const MENU_LAYOUT_STYLE = `
@layer utilities {
	.contents { display: contents; }
}
`;

/** The three parts that wrap the label a consumer passes. */
const wrappedParts = [
	{ slot: "dropdown-menu-sub-trigger", text: "Share" },
	{ slot: "dropdown-menu-checkbox-item", text: "Errors" },
	{ slot: "dropdown-menu-radio-item", text: "Small" },
] as const;

describe("DropdownMenu label slots (browser)", () => {
	let styleElement: HTMLStyleElement;

	beforeAll(() => {
		styleElement = document.createElement("style");
		styleElement.textContent = MENU_LAYOUT_STYLE;
		document.head.appendChild(styleElement);
	});

	afterAll(() => {
		styleElement.remove();
	});

	test.each(wrappedParts)("$slot's label span generates no box", ({ slot, text }) => {
		render(
			<DropdownMenu.Root open modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Sub open>
						<DropdownMenu.SubTrigger>Share</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<DropdownMenu.Item>Copy link</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
					<DropdownMenu.CheckboxItem checked>Errors</DropdownMenu.CheckboxItem>
					<DropdownMenu.RadioGroup value="small">
						<DropdownMenu.RadioItem value="small">Small</DropdownMenu.RadioItem>
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);

		const label = document.querySelector(`[data-slot="${slot}-label"]`);
		if (label == null) {
			throw new Error(`No element carries data-slot="${slot}-label".`);
		}

		expect(label).toHaveTextContent(text);
		expect(getComputedStyle(label).display).toBe("contents");
		expect(label.getClientRects()).toHaveLength(0);
	});
});
