import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
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

	describe("Combobox.Item", () => {
		test("renders as an option, and a click writes its value into the input", async () => {
			const user = userEvent.setup();
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content>
						<Combobox.Item value="Apple" />
						<Combobox.Item value="Banana" />
					</Combobox.Content>
				</Combobox.Root>,
			);
			const input = screen.getByRole("combobox", { name: "Fruit" });

			await user.click(input);
			const banana = await screen.findByRole("option", { name: "Banana" });
			expect(banana).toHaveAttribute("data-slot", "combobox-item");

			await user.click(banana);

			expect(input).toHaveValue("Banana");
		});

		test("Combobox.ItemValue splits the item value around the typed text", async () => {
			// `ItemValue` reads the item value from ariakit's own item context.
			// Catches dropping `value` from the item, which leaves it nothing to split.
			const user = userEvent.setup();
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content>
						<Combobox.Item value="Banana">
							<Combobox.ItemValue />
						</Combobox.Item>
					</Combobox.Content>
				</Combobox.Root>,
			);

			await user.type(screen.getByRole("combobox", { name: "Fruit" }), "Ba");

			// By role alone: happy-dom reports no `display` for the split spans, so
			// the name algorithm inserts a space and reads "Ba nana". A browser reads
			// "Banana". This list has one option.
			const option = await screen.findByRole("option");
			expect(option).toHaveTextContent("Banana");
			const textOf = (selector: string) =>
				Array.from(option.querySelectorAll(selector), (span) => span.textContent).join("");
			expect(textOf("[data-user-value]")).toBe("Ba");
			expect(textOf("[data-autocomplete-value]")).toBe("nana");
		});
	});
});
