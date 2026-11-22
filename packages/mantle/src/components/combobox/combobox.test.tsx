import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import * as Field from "../field/field-parts.js";
import * as Combobox from "./combobox-parts.js";

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

		test("the highlighted option is the selected one, and the input names it only while open", async () => {
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
			expect(input).not.toHaveAttribute("aria-controls");

			await user.click(input);
			await user.keyboard("{ArrowDown}{ArrowDown}");

			expect(input).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);
			expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute(
				"aria-selected",
				"true",
			);
			expect(screen.getByRole("option", { name: "Apple" })).not.toHaveAttribute("aria-selected");
		});

		test("Combobox.ItemValue splits the item value around the typed text", async () => {
			// `ItemValue` reads the item value from the item's context.
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

	describe("review fixes", () => {
		test("options that arrive after the keystroke still get the highlight, so Enter picks the first", async () => {
			const user = userEvent.setup();
			let resolve = (_items: string[]) => {};
			const Async = () => {
				const [items, setItems] = useState<string[]>([]);
				resolve = (next) => setItems(next);
				return (
					<Combobox.Root>
						<Combobox.Input aria-label="Fruit" />
						<Combobox.Content>
							{items.map((item) => (
								<Combobox.Item key={item} value={item} />
							))}
						</Combobox.Content>
					</Combobox.Root>
				);
			};
			render(<Async />);
			const input = screen.getByRole("combobox", { name: "Fruit" });
			await user.type(input, "b");
			await act(async () => {
				resolve(["Banana", "Blueberry"]);
			});
			await vi.waitFor(() => {
				expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute("data-highlighted");
			});
			await user.keyboard("{Enter}");
			expect(input).toHaveValue("Banana");
		});

		test("while an input method composes, the arrows and Escape belong to it", async () => {
			const user = userEvent.setup();
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content>
						<Combobox.Item value="Apple" />
					</Combobox.Content>
				</Combobox.Root>,
			);
			const input = screen.getByRole("combobox", { name: "Fruit" });
			await user.click(input);
			const composing = new KeyboardEvent("keydown", {
				key: "Escape",
				bubbles: true,
				cancelable: true,
				isComposing: true,
			});
			act(() => {
				input.dispatchEvent(composing);
			});
			expect(composing.defaultPrevented).toBe(false);
			expect(input).toHaveAttribute("aria-expanded", "true");
		});

		test("an asChild item with its own id still takes the highlight", async () => {
			const user = userEvent.setup();
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content>
						<Combobox.Item value="Apple" asChild>
							<a id="apple-link" href="#apple">
								Apple
							</a>
						</Combobox.Item>
					</Combobox.Content>
				</Combobox.Root>,
			);
			await user.click(screen.getByRole("combobox", { name: "Fruit" }));
			const apple = screen.getByRole("option", { name: "Apple" });
			expect(apple).toHaveAttribute("id", "apple-link");
			expect(apple).toHaveAttribute("data-highlighted");
		});

		test("consumer onClick and onMouseDown run, and preventDefault in onClick cancels the pick", async () => {
			const user = userEvent.setup();
			const onMouseDown = vi.fn<() => void>();
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content onMouseDown={onMouseDown}>
						<Combobox.Item value="Apple" onClick={(event) => event.preventDefault()} />
						<Combobox.Item value="Banana" />
					</Combobox.Content>
				</Combobox.Root>,
			);
			const input = screen.getByRole("combobox", { name: "Fruit" });
			await user.click(input);
			await user.click(screen.getByRole("option", { name: "Apple" }));
			expect(onMouseDown).toHaveBeenCalledTimes(1);
			expect(input).toHaveValue("");
			await user.click(screen.getByRole("option", { name: "Banana" }));
			expect(input).toHaveValue("Banana");
		});

		test("preventDefault on an asChild item's own onClick cancels the pick", async () => {
			const user = userEvent.setup();
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content>
						<Combobox.Item value="Apple" asChild>
							<a href="#apple" onClick={(event) => event.preventDefault()}>
								Apple
							</a>
						</Combobox.Item>
					</Combobox.Content>
				</Combobox.Root>,
			);
			const input = screen.getByRole("combobox", { name: "Fruit" });
			await user.click(input);
			await user.click(screen.getByRole("option", { name: "Apple" }));
			expect(input).toHaveValue("");
			expect(input).toHaveAttribute("aria-expanded", "true");
		});

		test("a selection and options that change in one update move the highlight to a live option", async () => {
			const user = userEvent.setup();
			let swap = () => {};
			const Swapping = () => {
				const [fruit, setFruit] = useState("Apple");
				swap = () => setFruit("Banana");
				return (
					<Combobox.Root selectedValue={fruit}>
						<Combobox.Input aria-label="Fruit" />
						<Combobox.Content>
							<Combobox.Item key={fruit} value={fruit} />
						</Combobox.Content>
					</Combobox.Root>
				);
			};
			render(<Swapping />);
			const input = screen.getByRole("combobox", { name: "Fruit" });
			await user.click(input);
			act(() => {
				swap();
			});
			await vi.waitFor(() => {
				expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute("data-highlighted");
			});
			await user.keyboard("{Enter}");
			expect(input).toHaveValue("Banana");
		});
	});

	test("hydrates server markup with no mismatch", () => {
		const element = (
			<Combobox.Root defaultInputValue="acme">
				<Combobox.Input aria-label="Domain" />
				<Combobox.Content>
					<Combobox.Item value="acme.ngrok.app">
						<Combobox.ItemValue />
					</Combobox.Item>
				</Combobox.Content>
			</Combobox.Root>
		);
		const container = document.createElement("div");
		container.innerHTML = renderToString(element);
		document.body.append(container);
		const serverInput = container.querySelector("input");
		expect(serverInput).toHaveValue("acme");
		expect(serverInput).toHaveAttribute("aria-expanded", "false");
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		const onRecoverableError = vi.fn<(error: unknown) => void>();
		let root: ReturnType<typeof hydrateRoot> | undefined;
		act(() => {
			root = hydrateRoot(container, element, { onRecoverableError });
		});
		expect(onRecoverableError).toHaveBeenCalledTimes(0);
		expect(consoleError).toHaveBeenCalledTimes(0);
		expect(container.querySelector("input")).toBe(serverInput);
		act(() => {
			root?.unmount();
		});
		container.remove();
		consoleError.mockRestore();
	});
});
