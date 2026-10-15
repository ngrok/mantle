import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { MouseEvent as ReactMouseEvent } from "react";
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

	describe("readOnly", () => {
		// Radix's Switch has no read-only mode, so the `aria-readonly` announcement
		// and the click guard behind it are both mantle's own.
		test("exposes aria-readonly and does not toggle on click, and the click skips the caller's onClick", async () => {
			const user = userEvent.setup();
			const onCheckedChange = vi.fn<(checked: boolean) => void>();
			const handleClick = vi.fn<(event: ReactMouseEvent<HTMLButtonElement>) => void>();
			render(
				<Switch
					aria-label="Static"
					defaultChecked
					readOnly
					onCheckedChange={onCheckedChange}
					onClick={handleClick}
				/>,
			);

			const toggle = screen.getByRole("switch", { name: "Static" });
			expect(toggle).toHaveAttribute("aria-readonly", "true");

			await user.click(toggle);
			expect(toggle).toHaveAttribute("aria-checked", "true");
			expect(onCheckedChange).toHaveBeenCalledTimes(0);
			expect(handleClick).toHaveBeenCalledTimes(0);
		});

		test('aria-readonly="true" alone engages the click guard', async () => {
			// `readOnly` parses `readOnly ?? aria-readonly`, so the booleanish string
			// form of the ARIA attribute guards too.
			const user = userEvent.setup();
			const onCheckedChange = vi.fn<(checked: boolean) => void>();
			render(
				<Switch
					aria-label="Airplane mode"
					aria-readonly="true"
					onCheckedChange={onCheckedChange}
				/>,
			);

			const toggle = screen.getByRole("switch", { name: "Airplane mode" });
			await user.click(toggle);

			expect(toggle).toHaveAttribute("aria-checked", "false");
			expect(onCheckedChange).toHaveBeenCalledTimes(0);
		});

		test('aria-readonly="false" parses as editable', async () => {
			const user = userEvent.setup();
			const onCheckedChange = vi.fn<(checked: boolean) => void>();
			render(
				<Switch
					aria-label="Airplane mode"
					aria-readonly="false"
					onCheckedChange={onCheckedChange}
				/>,
			);

			const toggle = screen.getByRole("switch", { name: "Airplane mode" });
			await user.click(toggle);

			expect(toggle).toHaveAttribute("aria-checked", "true");
			expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
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

		test("toggles on click when editable and forwards the click to onClick", async () => {
			const user = userEvent.setup();
			const handleClick = vi.fn<(event: ReactMouseEvent<HTMLButtonElement>) => void>();
			render(<Switch aria-label="Editable" onClick={handleClick} />);

			const toggle = screen.getByRole("switch", { name: "Editable" });
			expect(toggle).toHaveAttribute("aria-readonly", "false");

			await user.click(toggle);
			expect(toggle).toHaveAttribute("aria-checked", "true");
			expect(handleClick).toHaveBeenCalledTimes(1);
			expect(handleClick.mock.lastCall?.[0].target).toBe(toggle);
		});
	});
});
