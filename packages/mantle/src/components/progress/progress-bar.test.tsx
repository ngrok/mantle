import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import * as ProgressBar from "./progress-bar-parts.js";

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
		expect(bar.querySelector('[data-slot="progress-bar-indicator"]')).not.toBeNull();
	});

	test("states the percent in aria-valuetext, then 100% at max", () => {
		const { rerender } = render(
			<ProgressBar.Root aria-label="Upload progress" value={50} max={200} />,
		);
		const bar = screen.getByRole("progressbar");
		expect(bar).toHaveAttribute("aria-valuetext", "25%");
		expect(bar).not.toHaveAttribute("data-indeterminate");
		rerender(<ProgressBar.Root aria-label="Upload progress" value={200} max={200} />);
		expect(bar).toHaveAttribute("aria-valuetext", "100%");
	});

	test("respects a custom max", () => {
		render(<ProgressBar.Root aria-label="Upload progress" value={150} max={200} />);
		const bar = screen.getByRole("progressbar");
		expect(bar).toHaveAttribute("aria-valuemax", "200");
		expect(bar).toHaveAttribute("aria-valuenow", "150");
	});

	test("omits aria-valuenow and marks data-indeterminate while indeterminate", () => {
		render(<ProgressBar.Root aria-label="Upload progress" value="indeterminate" />);
		const bar = screen.getByRole("progressbar");
		expect(bar).not.toHaveAttribute("aria-valuenow");
		expect(bar).toHaveAttribute("data-indeterminate", "");
	});

	test("the indicator translates by the remaining fraction of max", () => {
		render(
			<ProgressBar.Root aria-label="Upload progress" value={60}>
				<ProgressBar.Indicator />
			</ProgressBar.Root>,
		);
		const indicator = screen
			.getByRole("progressbar")
			.querySelector<HTMLElement>('[data-slot="progress-bar-indicator"]');
		expect(indicator).not.toBeNull();
		expect(indicator?.style.transform).toBe("translateX(-40%)");
	});

	test("a value outside 0..max renders as indeterminate", () => {
		render(
			<ProgressBar.Root aria-label="Upload progress" value={150}>
				<ProgressBar.Indicator />
			</ProgressBar.Root>,
		);
		const bar = screen.getByRole("progressbar");
		expect(bar).not.toHaveAttribute("aria-valuenow");
		const indicator = bar.querySelector<HTMLElement>('[data-slot="progress-bar-indicator"]');
		expect(indicator).not.toBeNull();
		expect(indicator?.style.transform).toBe("translateX(-100%)");
	});
});
