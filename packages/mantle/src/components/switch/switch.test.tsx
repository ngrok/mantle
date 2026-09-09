import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { Field } from "../field/field.js";
import { Switch } from "./switch.js";

describe("Switch", () => {
	test('given validation={false}, renders a switch with aria-invalid="false" and no data-validation', () => {
		render(<Switch validation={false} />);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("switch")).not.toHaveAttribute("data-validation");
	});

	test('given validation="success", renders a switch with aria-invalid="false" and data-validation="success"', () => {
		render(<Switch validation="success" />);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("switch")).toHaveAttribute("data-validation", "success");
	});

	test('given validation="warning", renders a switch with aria-invalid="false" and data-validation="warning"', () => {
		render(<Switch validation="warning" />);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("switch")).toHaveAttribute("data-validation", "warning");
	});

	test('given validation="error", renders a switch with aria-invalid="true" and data-validation="error"', () => {
		render(<Switch validation="error" />);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("switch")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="success", renders a switch with aria-invalid="true" and data-validation="error"', () => {
		render(<Switch aria-invalid="true" validation="success" />);
		expect(screen.getByRole("switch")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("switch")).toHaveAttribute("data-validation", "error");
	});

	test("inherits validation from Field.Item without a direct validation prop", () => {
		render(
			<Field.Item name="example" validation="warning">
				<Switch />
			</Field.Item>,
		);

		expect(screen.getByRole("switch")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("switch")).toHaveAttribute("data-validation", "warning");
	});

	test("inherits Field.Item validation through Field.Control", () => {
		render(
			<Field.Item name="example" validation="error">
				<Field.Control>
					<Switch />
				</Field.Control>
			</Field.Item>,
		);

		expect(screen.getByRole("switch")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("switch")).toHaveAttribute("data-validation", "error");
	});

	describe("readOnly", () => {
		test("exposes aria-readonly and does not toggle on click", async () => {
			const user = userEvent.setup();
			const onCheckedChange = vi.fn<(checked: boolean) => void>();
			render(
				<Switch aria-label="Static" defaultChecked readOnly onCheckedChange={onCheckedChange} />,
			);

			const toggle = screen.getByRole("switch", { name: "Static" });
			expect(toggle).toHaveAttribute("aria-readonly", "true");

			await user.click(toggle);
			expect(toggle).toHaveAttribute("aria-checked", "true");
			expect(onCheckedChange).toHaveBeenCalledTimes(0);
		});

		// Regression: the readOnly guard once called `stopPropagation`, so a
		// clickable row around the switch never saw the click.
		test("a click on a read-only switch still reaches an ancestor handler", async () => {
			const user = userEvent.setup();
			const onRowClick = vi.fn<() => void>();
			render(
				<div role="presentation" onClick={onRowClick}>
					<Switch aria-label="Static" readOnly />
				</div>,
			);

			await user.click(screen.getByRole("switch", { name: "Static" }));
			expect(onRowClick).toHaveBeenCalledTimes(1);
		});

		test("toggles on click when editable", async () => {
			const user = userEvent.setup();
			render(<Switch aria-label="Editable" />);

			const toggle = screen.getByRole("switch", { name: "Editable" });
			expect(toggle).toHaveAttribute("aria-readonly", "false");

			await user.click(toggle);
			expect(toggle).toHaveAttribute("aria-checked", "true");
		});
	});
});
