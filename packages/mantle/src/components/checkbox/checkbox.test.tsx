import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useLayoutEffect, useRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { Field } from "../field/field.js";
import { Checkbox, selectAllChecked } from "./checkbox.js";
import type { CheckedState } from "./checkbox.js";

type IndeterminateProbeProps = {
	checked?: CheckedState;
	defaultChecked?: CheckedState;
	onLayout: (value: boolean) => void;
};

// Why a parent layout effect: React runs the child's layout effects before the
// parent's, and passive effects after both. The probe reads the DOM property
// before the browser paints, so it sees `true` only when `Checkbox` wrote it in
// a layout effect.
function IndeterminateProbe({ checked, defaultChecked, onLayout }: IndeterminateProbeProps) {
	const ref = useRef<HTMLInputElement>(null);
	useLayoutEffect(() => {
		onLayout(ref.current?.indeterminate ?? false);
	});
	if (checked != null) {
		return <Checkbox ref={ref} checked={checked} onChange={() => {}} />;
	}
	return <Checkbox ref={ref} defaultChecked={defaultChecked} />;
}

describe("Checkbox", () => {
	test('given validation={false}, renders a checkbox with aria-invalid="false" and not have data-validation', () => {
		render(<Checkbox validation={false} />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("checkbox")).not.toHaveAttribute("data-validation");
	});

	test('given validation="success", renders a checkbox with aria-invalid="false" and data-validation="success"', () => {
		render(<Checkbox validation="success" />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "success");
	});

	test('given validation="warning", renders a checkbox with aria-invalid="false" and data-validation="warning"', () => {
		render(<Checkbox validation="warning" />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "warning");
	});

	test('given validation="error", renders a checkbox with aria-invalid="true" and data-validation="error"', () => {
		render(<Checkbox validation="error" />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="success", renders a checkbox with aria-invalid="true" and data-validation="error"', () => {
		render(<Checkbox aria-invalid="true" validation="success" />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="warning", renders a checkbox with aria-invalid="true" and data-validation="error"', () => {
		render(<Checkbox aria-invalid="true" validation="warning" />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="error", renders a checkbox with aria-invalid="true" and data-validation="error"', () => {
		render(<Checkbox aria-invalid="true" validation="error" />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "error");
	});

	test("inherits validation from Field.Item without a direct validation prop", () => {
		render(
			<Field.Item name="example" validation="warning">
				<Checkbox />
			</Field.Item>,
		);

		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "warning");
	});

	test("inherits Field.Item validation through Field.Control", () => {
		render(
			<Field.Item name="example" validation="error">
				<Field.Control>
					<Checkbox />
				</Field.Control>
			</Field.Item>,
		);

		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "error");
	});

	test("a callback ref fires once with the input across a re-render", () => {
		const refSpy = vi.fn<(node: HTMLInputElement | null) => void>();
		const { rerender } = render(<Checkbox ref={refSpy} checked={false} onChange={() => {}} />);
		rerender(<Checkbox ref={refSpy} checked={false} onChange={() => {}} />);

		expect(refSpy).toHaveBeenCalledTimes(1);
		expect(refSpy).toHaveBeenLastCalledWith(screen.getByRole("checkbox"));
	});

	test('given checked="indeterminate", reports aria-checked="mixed"', () => {
		render(<Checkbox checked="indeterminate" onChange={() => {}} />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "mixed");
	});

	describe("native indeterminate property", () => {
		test.each([
			{ label: 'checked="indeterminate"', props: { checked: "indeterminate" as const } },
			{
				label: 'defaultChecked="indeterminate"',
				props: { defaultChecked: "indeterminate" as const },
			},
		])("given $label, the property is set before the parent layout effect runs", ({ props }) => {
			const onLayout = vi.fn<(value: boolean) => void>();
			render(<IndeterminateProbe {...props} onLayout={onLayout} />);

			expect(onLayout).toHaveBeenCalledTimes(1);
			expect(onLayout).toHaveBeenLastCalledWith(true);
			expect(screen.getByRole<HTMLInputElement>("checkbox").indeterminate).toBe(true);
		});

		test("a controlled change to and from indeterminate rewrites the property before paint", () => {
			const onLayout = vi.fn<(value: boolean) => void>();
			const { rerender } = render(<IndeterminateProbe checked={false} onLayout={onLayout} />);
			expect(onLayout).toHaveBeenLastCalledWith(false);

			rerender(<IndeterminateProbe checked="indeterminate" onLayout={onLayout} />);
			expect(onLayout).toHaveBeenCalledTimes(2);
			expect(onLayout).toHaveBeenLastCalledWith(true);

			rerender(<IndeterminateProbe checked={true} onLayout={onLayout} />);
			expect(onLayout).toHaveBeenCalledTimes(3);
			expect(onLayout).toHaveBeenLastCalledWith(false);
			expect(screen.getByRole<HTMLInputElement>("checkbox").checked).toBe(true);
		});
	});

	test("toggling a controlled checkbox through indeterminate does not warn about controlled/uncontrolled (regression)", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		try {
			// A controlled "select all" checkbox cycles unchecked → indeterminate → checked.
			// The indeterminate frame must keep `checked` a boolean so React never sees the
			// input flip from controlled to uncontrolled.
			const { rerender } = render(<Checkbox checked={false} onChange={() => {}} />);
			rerender(<Checkbox checked="indeterminate" onChange={() => {}} />);
			rerender(<Checkbox checked={true} onChange={() => {}} />);

			const messages = errorSpy.mock.calls.map((args) => args.map(String).join(" "));
			expect(messages.some((message) => message.includes("uncontrolled"))).toBe(false);
		} finally {
			errorSpy.mockRestore();
		}
	});

	describe("readOnly", () => {
		test("exposes aria-readonly and does not toggle on click", async () => {
			const user = userEvent.setup();
			render(<Checkbox aria-label="Static" defaultChecked readOnly />);

			const checkbox = screen.getByRole("checkbox", { name: "Static" });
			expect(checkbox).toHaveAttribute("aria-readonly", "true");

			// React still dispatches `onChange` for a prevented click; the checked
			// state is the contract.
			await user.click(checkbox);
			expect(checkbox).toBeChecked();
		});

		test("omits aria-readonly when the checkbox is editable", async () => {
			const user = userEvent.setup();
			render(<Checkbox aria-label="Editable" />);

			const checkbox = screen.getByRole("checkbox", { name: "Editable" });
			expect(checkbox).not.toHaveAttribute("aria-readonly");

			await user.click(checkbox);
			expect(checkbox).toBeChecked();
		});
	});
});

describe("selectAllChecked", () => {
	test("returns true when all items are selected", () => {
		expect(selectAllChecked({ allSelected: true, someSelected: false })).toBe(true);
	});

	test('returns "indeterminate" when some but not all items are selected', () => {
		expect(selectAllChecked({ allSelected: false, someSelected: true })).toBe("indeterminate");
	});

	test("returns false when no items are selected", () => {
		expect(selectAllChecked({ allSelected: false, someSelected: false })).toBe(false);
	});

	test("prioritizes all-selected over some-selected", () => {
		expect(selectAllChecked({ allSelected: true, someSelected: true })).toBe(true);
	});
});
