"use client";

import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import { IconButton } from "./icon-button.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the size utilities. The `[&_svg]`
 * selector must beat the `size-5` that `Icon` puts on the svg itself, and only
 * a real cascade can show that it does.
 */
const STYLE = `
@layer utilities {
	.size-4 { width: 1rem; height: 1rem; }
	.size-5 { width: 1.25rem; height: 1.25rem; }
	.size-6 { width: 1.5rem; height: 1.5rem; }
	.\\[\\&_svg\\]\\:size-4 svg { width: 1rem; height: 1rem; }
}
`;

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		STYLE,
		await commands.tailwindCss("./icon-button.tsx"),
		await commands.tailwindCss("./icon-button-variants.ts"),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

describe("IconButton size", () => {
	test(`size="2xs" renders a 20px box with a 16px icon`, () => {
		render(
			<IconButton
				appearance="ghost"
				intent="neutral"
				size="2xs"
				label="Copy ID"
				icon={<GlobeIcon />}
			/>,
		);
		const button = screen.getByRole("button", { name: "Copy ID" });
		const icon = button.querySelector("svg");
		expect(button.getBoundingClientRect().height).toBe(20);
		expect(icon?.getBoundingClientRect().width).toBe(16);
	});

	test(`size="xs" keeps the 20px icon`, () => {
		render(
			<IconButton
				appearance="ghost"
				intent="neutral"
				size="xs"
				label="Copy ID"
				icon={<GlobeIcon />}
			/>,
		);
		const icon = screen.getByRole("button", { name: "Copy ID" }).querySelector("svg");
		expect(icon?.getBoundingClientRect().width).toBe(20);
	});
});

/** The center of an element's painted box. A scale transition keeps it still. */
function centerOf(element: Element | null | undefined) {
	const rect = element?.getBoundingClientRect();
	return rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

describe("IconButton loading", () => {
	test("the spinner sits on the icon's center, and the box keeps its size and place", () => {
		const props = {
			appearance: "outlined",
			intent: "neutral",
			label: "Save",
			icon: <GlobeIcon />,
		} as const;
		const { rerender } = render(<IconButton {...props} />);
		const button = screen.getByRole("button", { name: "Save" });
		const idleBox = button.getBoundingClientRect().toJSON();
		const idleIconCenter = centerOf(button.firstElementChild);

		rerender(<IconButton {...props} isLoading />);

		const spinner = button.lastElementChild;
		expect(spinner).not.toBe(button.firstElementChild);
		expect(button.getBoundingClientRect().toJSON()).toEqual(idleBox);
		expect(centerOf(spinner)).toEqual(idleIconCenter);
		expect(centerOf(button.firstElementChild)).toEqual(idleIconCenter);
	});
});
