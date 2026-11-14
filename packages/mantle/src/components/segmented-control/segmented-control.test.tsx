import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { SegmentedControl } from "./segmented-control.js";

describe("SegmentedControl.Root", () => {
	test("renders a named radio group and forwards className, data attributes, and ref", () => {
		const refSpy = vi.fn<(node: HTMLElement | null) => void>();
		render(
			<SegmentedControl.Root
				aria-label="View"
				className="w-fit"
				data-testid="view"
				defaultValue="list"
				ref={refSpy}
			>
				<SegmentedControl.Item value="list">List</SegmentedControl.Item>
				<SegmentedControl.Item value="grid">Grid</SegmentedControl.Item>
			</SegmentedControl.Root>,
		);

		const control = screen.getByRole("radiogroup", { name: "View" });
		expect(control).toHaveAttribute("data-slot", "segmented-control");
		expect(control).toHaveAttribute("data-testid", "view");
		expect(control).toHaveClass("w-fit");
		expect(refSpy).toHaveBeenLastCalledWith(control);
		expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute(
			"data-slot",
			"segmented-control-item",
		);
	});

	test("arrow keys check the next enabled item and report its value", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn<(value: string) => void>();
		render(
			<SegmentedControl.Root aria-label="Environment" defaultValue="dev" onChange={onChange}>
				<SegmentedControl.Item value="dev">Dev</SegmentedControl.Item>
				<SegmentedControl.Item value="staging" disabled>
					Staging
				</SegmentedControl.Item>
				<SegmentedControl.Item value="prod">Prod</SegmentedControl.Item>
			</SegmentedControl.Root>,
		);

		await user.click(screen.getByRole("radio", { name: "Dev" }));
		await user.keyboard("{ArrowRight}");

		expect(screen.getByRole("radio", { name: "Prod" })).toBeChecked();
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenLastCalledWith("prod");
	});

	test("with a name, a form submits the checked value", async () => {
		const user = userEvent.setup();
		render(
			<form aria-label="Settings">
				<SegmentedControl.Root aria-label="View" name="view" defaultValue="list">
					<SegmentedControl.Item value="list">List</SegmentedControl.Item>
					<SegmentedControl.Item value="grid">Grid</SegmentedControl.Item>
				</SegmentedControl.Root>
			</form>,
		);

		await user.click(screen.getByRole("radio", { name: "Grid" }));

		const form = screen.getByRole("form", { name: "Settings" });
		if (!(form instanceof HTMLFormElement)) {
			throw new Error("Expected a form element.");
		}
		expect(new FormData(form).get("view")).toBe("grid");
	});
});

describe("SegmentedControl.Item", () => {
	test("throws when rendered outside SegmentedControl.Root", () => {
		// Why: silence React's error log for the expected throw.
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<SegmentedControl.Item value="list">List</SegmentedControl.Item>)).toThrow(
			"SegmentedControl.Item must be rendered inside SegmentedControl.Root.",
		);
	});
});
