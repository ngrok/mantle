import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import * as SplitButton from "./split-button-parts.js";

describe("SplitButton menu placement (browser)", () => {
	test.each([
		{ align: undefined, edge: "right" },
		{ align: "start", edge: "left" },
	] as const)(
		"MenuContent align=$align lines up the menu's $edge edge with the caret's",
		async ({ align, edge }) => {
			render(
				<div style={{ position: "absolute", left: 120, top: 20 }}>
					<SplitButton.Root open>
						<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
						<SplitButton.MenuTrigger label="More save options" />
						<SplitButton.MenuContent align={align} style={{ width: 160, boxSizing: "border-box" }}>
							<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
						</SplitButton.MenuContent>
					</SplitButton.Root>
				</div>,
			);
			const caret = screen
				.getByRole("button", { name: "More save options" })
				.getBoundingClientRect();

			await expect
				.poll(() => Math.round(screen.getByRole("menu").getBoundingClientRect()[edge]))
				.toBe(Math.round(caret[edge]));
		},
	);
});
