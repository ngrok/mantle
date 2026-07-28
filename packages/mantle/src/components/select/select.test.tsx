import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { Field } from "../field/field.js";
import { Select } from "./select.js";

describe("Select", () => {
	test('given validation={false}, renders a Select.Trigger with aria-invalid="false" and not have data-validation', () => {
		render(
			<Select.Root validation={false}>
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).not.toHaveAttribute("data-validation");
	});

	test('given validation="success", renders a Select.Trigger with aria-invalid="false" and data-validation="success"', () => {
		render(
			<Select.Root validation="success">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "success");
	});

	test('given validation="warning", renders a Select.Trigger with aria-invalid="false" and data-validation="warning"', () => {
		render(
			<Select.Root validation="warning">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "warning");
	});

	test('given validation="error", renders a Select.Trigger with aria-invalid="true" and data-validation="error"', () => {
		render(
			<Select.Root validation="error">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="success", renders a Select.Trigger with aria-invalid="true" and data-validation="error"', () => {
		render(
			<Select.Root aria-invalid="true" validation="success">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="warning", renders a Select.Trigger with aria-invalid="true" and data-validation="error"', () => {
		render(
			<Select.Root aria-invalid="true" validation="warning">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="error", renders a Select.Trigger with aria-invalid="true" and data-validation="error"', () => {
		render(
			<Select.Root aria-invalid="true" validation="error">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test("Field.Item validation={false} suppresses inferred error state on the trigger", () => {
		render(
			<Field.Item name="example" validation={false}>
				<Select.Root>
					<Field.Control>
						<Select.Trigger />
					</Field.Control>
				</Select.Root>
			</Field.Item>,
		);

		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).not.toHaveAttribute("data-validation");
	});

	test("Select.Trigger validation wins over Field.Item validation", () => {
		render(
			<Field.Item name="example" validation={false}>
				<Select.Root>
					<Field.Control>
						<Select.Trigger validation="warning" />
					</Field.Control>
				</Select.Root>
			</Field.Item>,
		);

		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "warning");
	});

	test("Select.Root validation wins over Field.Item validation", () => {
		render(
			<Field.Item name="example" validation={false}>
				<Select.Root validation="error">
					<Field.Control>
						<Select.Trigger />
					</Field.Control>
				</Select.Root>
			</Field.Item>,
		);

		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test("Field.Control wrapping Select.Root applies field ARIA wiring to the trigger", () => {
		// The user-friendly form puts Field.Control above Select.Root, not
		// around Select.Trigger. cloneElement onto Select.Root reaches the
		// trigger via SelectContext for id / aria-invalid, and the trigger
		// reads FieldControlContext for aria-describedby / aria-errormessage
		// (which Select.Root does not forward).
		render(
			<Field.Item name="example">
				<Field.Label data-testid="label">Fruit</Field.Label>
				<Field.Control>
					<Select.Root>
						<Select.Trigger
							aria-describedby="ignored-description"
							aria-errormessage="ignored-error"
							data-testid="trigger"
							id="ignored-trigger"
						>
							<Select.Value placeholder="Pick" />
						</Select.Trigger>
					</Select.Root>
				</Field.Control>
				<Field.Errors data-testid="errors" messages={["Required."]} />
				<Field.Description data-testid="desc">Pick a fruit.</Field.Description>
			</Field.Item>,
		);

		const trigger = screen.getByTestId("trigger");
		const errors = screen.getByTestId("errors");
		const description = screen.getByTestId("desc");
		expect(trigger).toHaveAttribute("aria-invalid", "true");
		expect(trigger.getAttribute("aria-describedby")).toContain(errors.id);
		expect(trigger.getAttribute("aria-describedby")).toContain(description.id);
		expect(trigger.getAttribute("aria-describedby")).not.toContain("ignored-description");
		expect(trigger).toHaveAttribute("aria-errormessage", errors.id);
		// The field owns the id, so `Field.Label`'s `htmlFor` resolves to the
		// trigger — the caller-supplied id loses.
		expect(trigger.id).toBeTruthy();
		expect(trigger.id).not.toBe("ignored-trigger");
		expect(screen.getByTestId("label")).toHaveAttribute("for", trigger.id);
	});

	test("Field.Control outside Field.Item does not override Select props", () => {
		render(
			<Field.Control>
				<Select.Root validation="error">
					<Select.Trigger data-testid="trigger" id="fruit">
						<Select.Value placeholder="Pick" />
					</Select.Trigger>
				</Select.Root>
			</Field.Control>,
		);

		const trigger = screen.getByTestId("trigger");
		expect(trigger).toHaveAttribute("aria-invalid", "true");
		expect(trigger).toHaveAttribute("data-validation", "error");
		expect(trigger).toHaveAttribute("id", "fruit");
	});

	test("rendered Field errors force the trigger into error state even when Select.Root says otherwise", () => {
		// Field.Control wires aria-invalid="true" onto the trigger when the
		// Field has rendered errors, and an explicit invalid aria value always
		// resolves to "error" in parseValidation — so a "warning" claim from
		// Select.Root is overridden in this case. Consumers who need the
		// non-error Select.Root state to win must suppress the inferred error
		// via `validation` on Field.Item or Field.Control.
		render(
			<Field.Item name="example">
				<Select.Root validation="warning">
					<Field.Control>
						<Select.Trigger />
					</Field.Control>
				</Select.Root>
				<Field.Errors messages={["Pick a value."]} />
			</Field.Item>,
		);

		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	describe("selecting a value", () => {
		test("picking an item notifies both onValueChange and the deprecated onChange, and submits the value", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn<(value: string) => void>();
			const onValueChange = vi.fn<(value: string) => void>();
			render(
				<form aria-label="fruit form">
					<Select.Root name="fruit" onChange={onChange} onValueChange={onValueChange}>
						<Select.Trigger>
							<Select.Value placeholder="Pick a fruit" />
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								<Select.Label>Fruits</Select.Label>
								<Select.Item value="apple">Apple</Select.Item>
								<Select.Item value="banana">Banana</Select.Item>
							</Select.Group>
							<Select.Separator />
							<Select.Group>
								<Select.Label>Veggies</Select.Label>
								<Select.Item value="carrot">Carrot</Select.Item>
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</form>,
			);

			const trigger = screen.getByRole("combobox");
			expect(trigger).toHaveTextContent("Pick a fruit");

			await user.click(trigger);
			// Select.Label names its Select.Group, so the option list is
			// navigable by group.
			expect(screen.getByRole("group", { name: "Fruits" })).toBeInTheDocument();
			expect(screen.getByRole("group", { name: "Veggies" })).toBeInTheDocument();

			await user.click(screen.getByRole("option", { name: "Banana" }));

			// `onChange` is the deprecated alias — dropping it silently breaks
			// every consumer still on it.
			expect(onChange).toHaveBeenCalledExactlyOnceWith("banana");
			expect(onValueChange).toHaveBeenCalledExactlyOnceWith("banana");
			expect(trigger).toHaveTextContent("Banana");
			const form = screen.getByRole<HTMLFormElement>("form", { name: "fruit form" });
			expect(new FormData(form).get("fruit")).toBe("banana");
		});

		test("Select.Root forwards its ref to the trigger button", () => {
			const ref = createRef<HTMLButtonElement>();
			render(
				<Select.Root ref={ref}>
					<Select.Trigger>
						<Select.Value placeholder="Pick a fruit" />
					</Select.Trigger>
				</Select.Root>,
			);

			expect(ref.current).toBe(screen.getByRole("combobox"));
		});

		test("Select.Trigger's own ref is composed with the one from Select.Root", () => {
			const rootRef = createRef<HTMLButtonElement>();
			const triggerRef = createRef<HTMLButtonElement>();
			render(
				<Select.Root ref={rootRef}>
					<Select.Trigger ref={triggerRef}>
						<Select.Value placeholder="Pick a fruit" />
					</Select.Trigger>
				</Select.Root>,
			);

			const trigger = screen.getByRole("combobox");
			expect(rootRef.current).toBe(trigger);
			expect(triggerRef.current).toBe(trigger);
		});

		test("Select.Item renders its leading icon", async () => {
			const user = userEvent.setup();
			render(
				<Select.Root>
					<Select.Trigger>
						<Select.Value placeholder="Pick a fruit" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item icon={<CheckCircleIcon />} value="apple">
							Apple
						</Select.Item>
						<Select.Item value="banana">Banana</Select.Item>
					</Select.Content>
				</Select.Root>,
			);

			await user.click(screen.getByRole("combobox"));

			expect(
				screen.getByRole("option", { name: "Apple" }).querySelector('[data-slot="icon"]'),
			).toBeInTheDocument();
			expect(
				screen.getByRole("option", { name: "Banana" }).querySelector('[data-slot="icon"]'),
			).toBeNull();
		});
	});
});
