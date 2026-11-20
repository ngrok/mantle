import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, expect, test } from "vitest";
import { commands } from "vitest/browser";
import { SplitButton } from "./split-button.js";

let styleElement: HTMLStyleElement;

// Why the compiled CSS: the browser project loads no stylesheet. Without the
// real utilities, `width="root"` sets a custom property that no rule reads.
beforeAll(async () => {
	styleElement = document.createElement("style");
	// Why border-box: Tailwind's preflight sets it, and the menu's width holds
	// its border and padding only under it.
	styleElement.textContent = [
		"*, ::before, ::after { box-sizing: border-box; }",
		await commands.tailwindCss("./split-button.tsx"),
		await commands.tailwindCss("../dropdown-menu/dropdown-menu.tsx"),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

function OpenSplitButton({ label, width }: { label: string; width?: "root" }) {
	// Why the flex row: `Root` is a block-level flex box, so it hugs its parts
	// only as a flex item, as it does in a toolbar.
	return (
		<div style={{ display: "flex" }}>
			<SplitButton.Root defaultOpen data-testid="root">
				<SplitButton.PrimaryAction>{label}</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More deploy options" />
				<SplitButton.MenuContent width={width}>
					<SplitButton.MenuItem>Draft</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>
		</div>
	);
}

function width(element: Element) {
	return element.getBoundingClientRect().width;
}

/**
 * The distance between the right edges of the menu and the split button. Radix
 * rounds the menu's position to whole pixels, so a placed menu reads under 1.
 */
function rightEdgeGap(menu: Element, root: Element) {
	return Math.abs(menu.getBoundingClientRect().right - root.getBoundingClientRect().right);
}

test('width="root" lines the menu up with both edges of the split button, and follows it as it grows', async () => {
	const { rerender } = render(<OpenSplitButton label="Deploy to production" width="root" />);
	const root = screen.getByTestId("root");
	const menu = screen.getByRole("menu");
	await expect.poll(() => width(menu)).toBe(width(root));
	await expect.poll(() => rightEdgeGap(menu, root)).toBeLessThan(1);
	const widthBefore = width(root);

	rerender(<OpenSplitButton label="Deploy to every production region in the world" width="root" />);

	expect(width(root)).toBeGreaterThan(widthBefore);
	await expect.poll(() => width(menu)).toBe(width(root));
	await expect.poll(() => rightEdgeGap(menu, root)).toBeLessThan(1);
});

test("without `width`, the menu keeps its intrinsic width", async () => {
	render(<OpenSplitButton label="Deploy to every production region" />);
	const root = screen.getByTestId("root");
	const menu = screen.getByRole("menu");

	await expect.poll(() => rightEdgeGap(menu, root)).toBeLessThan(1);
	expect(width(menu)).toBeLessThan(width(root));
});
