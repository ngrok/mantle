import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ProgressBar } from "./progress-bar.js";

describe("ProgressBar.Root", () => {
	test("renders a named progressbar with its value range", () => {
		render(
			<ProgressBar.Root aria-label="Upload progress" value={60}>
				<ProgressBar.Indicator />
			</ProgressBar.Root>,
		);
		const bar = screen.getByRole("progressbar", { name: "Upload progress" });
		expect(bar).toHaveAttribute("aria-valuemin", "0");
		expect(bar).toHaveAttribute("aria-valuemax", "100");
		expect(bar).toHaveAttribute("aria-valuenow", "60");
		expect(bar).toHaveAttribute("data-slot", "progress-bar");
	});

	test("respects a custom max", () => {
		render(<ProgressBar.Root aria-label="Upload progress" value={150} max={200} />);
		const bar = screen.getByRole("progressbar");
		expect(bar).toHaveAttribute("aria-valuemax", "200");
		expect(bar).toHaveAttribute("aria-valuenow", "150");
	});

	test("omits aria-valuenow while indeterminate", () => {
		render(<ProgressBar.Root aria-label="Upload progress" value="indeterminate" />);
		const bar = screen.getByRole("progressbar");
		expect(bar).not.toHaveAttribute("aria-valuenow");
		expect(bar).toHaveAttribute("data-state", "indeterminate");
	});

	test("a value outside 0..max renders as indeterminate", () => {
		render(<ProgressBar.Root aria-label="Upload progress" value={150} />);
		expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
	});
});
