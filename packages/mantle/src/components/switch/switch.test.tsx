import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { MouseEvent } from "react";
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
		// Radix's Switch has no read-only mode, so Switch hand-writes both the
		// `aria-readonly` announcement and the click guard that makes it true.
		test("readOnly announces aria-readonly", () => {
			render(<Switch aria-label="Airplane mode" readOnly />);
			expect(screen.getByRole("switch")).toHaveAttribute("aria-readonly", "true");
		});

		test("an editable switch announces aria-readonly=false", () => {
			render(<Switch aria-label="Airplane mode" readOnly={false} />);
			expect(screen.getByRole("switch")).toHaveAttribute("aria-readonly", "false");
		});

		test('a non-boolean aria-readonly does not engage the guard ("false" parses as editable)', async () => {
			const user = userEvent.setup();
			const onCheckedChange = vi.fn<(checked: boolean) => void>();
			render(
				<Switch
					aria-label="Airplane mode"
					aria-readonly="false"
					onCheckedChange={onCheckedChange}
				/>,
			);

			await user.click(screen.getByRole("switch"));

			expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
			expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
		});

		test("a click on a readOnly switch leaves it checked and calls neither onCheckedChange nor onClick", async () => {
			const user = userEvent.setup();
			const onCheckedChange = vi.fn<(checked: boolean) => void>();
			const onClick = vi.fn<(event: MouseEvent<HTMLButtonElement>) => void>();
			render(
				<Switch
					aria-label="Airplane mode"
					defaultChecked
					onCheckedChange={onCheckedChange}
					onClick={onClick}
					readOnly
				/>,
			);

			const switchControl = screen.getByRole("switch");
			await user.click(switchControl);

			expect(switchControl).toHaveAttribute("aria-checked", "true");
			expect(onCheckedChange).not.toHaveBeenCalled();
			expect(onClick).not.toHaveBeenCalled();
		});

		test('aria-readonly="true" alone engages the click guard', async () => {
			// `readOnly` is parsed from `readOnly ?? aria-readonly`, so the
			// booleanish string form of the ARIA attribute must guard too.
			const user = userEvent.setup();
			const onCheckedChange = vi.fn<(checked: boolean) => void>();
			render(
				<Switch
					aria-label="Airplane mode"
					aria-readonly="true"
					onCheckedChange={onCheckedChange}
				/>,
			);

			const switchControl = screen.getByRole("switch");
			await user.click(switchControl);

			expect(switchControl).toHaveAttribute("aria-checked", "false");
			expect(onCheckedChange).not.toHaveBeenCalled();
		});

		test("without readOnly, a click toggles the switch and forwards the event to onClick", async () => {
			const user = userEvent.setup();
			const onCheckedChange = vi.fn<(checked: boolean) => void>();
			// React nulls `currentTarget` once the handler returns, so record it
			// while the event is still live.
			const clickedElements: Array<EventTarget | null> = [];
			const onClick = vi.fn<(event: MouseEvent<HTMLButtonElement>) => void>((event) => {
				clickedElements.push(event.currentTarget);
			});
			render(
				<Switch aria-label="Airplane mode" onCheckedChange={onCheckedChange} onClick={onClick} />,
			);

			const switchControl = screen.getByRole("switch");
			await user.click(switchControl);

			expect(switchControl).toHaveAttribute("aria-checked", "true");
			expect(onCheckedChange).toHaveBeenCalledExactlyOnceWith(true);
			expect(onClick).toHaveBeenCalledTimes(1);
			expect(clickedElements).toEqual([switchControl]);
		});
	});
});
