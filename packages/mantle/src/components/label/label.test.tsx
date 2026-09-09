import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Label } from "./label.js";

describe("Label", () => {
	test("renders a native label with data-slot", () => {
		render(<Label>Email</Label>);
		const label = screen.getByText("Email");
		expect(label.tagName).toBe("LABEL");
		expect(label).toHaveAttribute("data-slot", "label");
	});

	// A `<label>` has no role that supports `aria-disabled`, so the disabled
	// style hangs off `data-disabled` instead.
	test("disabled stamps data-disabled and never aria-disabled", () => {
		render(<Label disabled>Email</Label>);
		const label = screen.getByText("Email");
		expect(label).toHaveAttribute("data-disabled", "true");
		expect(label).not.toHaveAttribute("aria-disabled");
	});

	test("an aria-disabled prop maps onto data-disabled", () => {
		render(<Label aria-disabled="true">Email</Label>);
		const label = screen.getByText("Email");
		expect(label).toHaveAttribute("data-disabled", "true");
		expect(label).not.toHaveAttribute("aria-disabled");
	});

	test('aria-disabled="false" stamps nothing', () => {
		render(<Label aria-disabled="false">Email</Label>);
		const label = screen.getByText("Email");
		expect(label).not.toHaveAttribute("data-disabled");
		expect(label).not.toHaveAttribute("aria-disabled");
	});
});
