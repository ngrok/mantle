import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, expect, test } from "vitest";
import { Tabs } from "./tabs.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the utilities this test reads, including
 * the slot-scoped icon rule the trigger carries. Inlined so the test stays
 * hermetic and needs no Tailwind build step: a browser test loads no stylesheet,
 * so without this the wrapper would report its initial `display` and the
 * assertion would pass for the wrong reason.
 */
const TABS_LAYOUT_STYLE = `
@layer utilities {
	.contents { display: contents; }
	.tabs-trigger { display: flex; align-items: center; gap: 0.5rem; }
	.tabs-trigger > [data-slot="tabs-trigger-label"] > svg { width: 1.25rem; height: 1.25rem; }
}
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = TABS_LAYOUT_STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

test("the label span generates no box, so an icon stays a flex child of the trigger", () => {
	render(
		<Tabs.Root orientation="horizontal" defaultValue="a">
			<Tabs.List>
				<Tabs.Trigger className="tabs-trigger" value="a">
					<svg data-testid="glyph" />
					Tab A
				</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="a">Panel A</Tabs.Content>
		</Tabs.Root>,
	);

	const trigger = screen.getByRole("tab");
	const label = trigger.querySelector('[data-slot="tabs-trigger-label"]');
	if (label == null) {
		throw new Error('No element carries data-slot="tabs-trigger-label".');
	}

	expect(getComputedStyle(label).display).toBe("contents");
	expect(label.getClientRects()).toHaveLength(0);

	// The slot-scoped rule reaches the icon through the wrapper, and the `gap`
	// still separates icon from text because the wrapper generates no box.
	const glyph = screen.getByTestId("glyph");
	expect(glyph.getBoundingClientRect().width).toBe(20);
	expect(glyph.parentElement).toBe(label);
});
