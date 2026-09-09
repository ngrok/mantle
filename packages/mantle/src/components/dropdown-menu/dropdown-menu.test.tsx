import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { DropdownMenu } from "./dropdown-menu.js";

describe("DropdownMenu", () => {
	describe("Shortcut", () => {
		test('locks translate="no" so a key name is never translated', () => {
			render(<DropdownMenu.Shortcut>⌘S</DropdownMenu.Shortcut>);
			expect(screen.getByText("⌘S")).toHaveAttribute("translate", "no");
		});

		test("a wider props object cannot carry translate past the type", () => {
			const wideProps: Record<string, string> = { translate: "yes" };
			render(<DropdownMenu.Shortcut {...wideProps}>⌘S</DropdownMenu.Shortcut>);
			expect(screen.getByText("⌘S")).toHaveAttribute("translate", "no");
		});
	});
});
