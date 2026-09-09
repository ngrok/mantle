import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Field } from "../field/field.js";
import { Combobox } from "./combobox.js";

describe("Combobox", () => {
	test('given validation="error", renders the input with aria-invalid="true" and data-validation="error"', () => {
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Fruit" validation="error" />
			</Combobox.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Fruit" });
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(input).toHaveAttribute("data-validation", "error");
	});

	test('given validation="success", renders the input with aria-invalid="false" and data-validation="success"', () => {
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Fruit" validation="success" />
			</Combobox.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Fruit" });
		expect(input).toHaveAttribute("aria-invalid", "false");
		expect(input).toHaveAttribute("data-validation", "success");
	});

	test("inside Field.Item, the label names the input and Field.Control wires id, name, and describedby", () => {
		render(
			<Field.Item name="subdomain">
				<Field.Label>Subdomain</Field.Label>
				<Combobox.Root>
					<Field.Control>
						<Combobox.Input />
					</Field.Control>
				</Combobox.Root>
				<Field.Description>Start typing to filter.</Field.Description>
			</Field.Item>,
		);
		const input = screen.getByRole("combobox", { name: "Subdomain" });
		expect(input.id).not.toBe("");
		expect(screen.getByText("Subdomain")).toHaveAttribute("for", input.id);
		expect(input).toHaveAttribute("name", "subdomain");
		expect(input.getAttribute("aria-describedby")).toContain(
			screen.getByText("Start typing to filter.").id,
		);
	});

	test("rendered Field.Errors put the input into the error state", () => {
		render(
			<Field.Item name="subdomain">
				<Field.Label>Subdomain</Field.Label>
				<Combobox.Root>
					<Field.Control>
						<Combobox.Input />
					</Field.Control>
				</Combobox.Root>
				<Field.Errors messages={["Pick a subdomain."]} />
			</Field.Item>,
		);
		const input = screen.getByRole("combobox", { name: "Subdomain" });
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(input).toHaveAttribute("data-validation", "error");
	});
});
