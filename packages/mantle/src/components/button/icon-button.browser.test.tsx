"use client";

import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
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

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
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
