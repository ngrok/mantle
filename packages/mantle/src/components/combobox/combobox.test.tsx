import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import * as Field from "../field/field-parts.js";
import * as Combobox from "./combobox-parts.js";

describe("Combobox", () => {
	test("a Tab into the input opens the list; focus from script does not", async () => {
		const user = userEvent.setup();
		render(
			<>
				<button type="button">Before</button>
				<Combobox.Root>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content>
						<Combobox.Item value="Apple" />
					</Combobox.Content>
				</Combobox.Root>
			</>,
		);
		const input = screen.getByRole("combobox", { name: "Fruit" });
		act(() => input.focus());
		expect(input).toHaveAttribute("aria-expanded", "false");
		act(() => screen.getByRole("button", { name: "Before" }).focus());

		await user.tab();

		expect(input).toHaveFocus();
		expect(input).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByRole("option", { name: "Apple" })).toBeInTheDocument();
	});

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
		// Red if a disabled item runs a click handler or follows its link: a disabled "create" row
		// then acts. `Slot` runs the child's handler first, so only a capture guard stops it.
		test("a disabled asChild link runs no click handler and opens on neither a click nor a middle click", async () => {
			const user = userEvent.setup();
			const onItemClick = vi.fn<() => void>();
			const onLinkClick = vi.fn<() => void>();
			const onListCapture = vi.fn<() => void>();
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content onClickCapture={onListCapture} onAuxClickCapture={onListCapture}>
						<Combobox.Item value="Apple" />
						<Combobox.Item value="Docs" disabled asChild onClick={onItemClick}>
							<a href="#docs" onClick={onLinkClick} onClickCapture={onLinkClick}>
								Docs
							</a>
						</Combobox.Item>
					</Combobox.Content>
				</Combobox.Root>,
			);
			const input = screen.getByRole("combobox", { name: "Fruit" });

			await user.click(input);
			const docs = await screen.findByRole("option", { name: "Docs" });

			expect(fireEvent.click(docs)).toBe(false);
			// Why: a middle click fires `auxclick`, which opens a link in a new tab.
			expect(
				fireEvent(docs, new MouseEvent("auxclick", { bubbles: true, cancelable: true, button: 1 })),
			).toBe(false);
			expect(onItemClick).toHaveBeenCalledTimes(0);
			expect(onLinkClick).toHaveBeenCalledTimes(0);
			expect(input).toHaveValue("");
			expect(onListCapture).toHaveBeenCalledTimes(0);

			// Why: the guard must still run the caller's capture handlers for an enabled item.
			const apple = screen.getByRole("option", { name: "Apple" });
			fireEvent(apple, new MouseEvent("auxclick", { bubbles: true, cancelable: true, button: 1 }));
			fireEvent.click(apple);
			expect(onListCapture).toHaveBeenCalledTimes(2);
			expect(input).toHaveValue("Apple");
		});

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
		test("Combobox.ItemValue drops the last match when the item value changes", () => {
			// Catches offsets kept from the old label: the new label would split at the old match.
			const value = (itemValue: string, userValue: string) => (
				<Combobox.Root>
					<Combobox.ItemValue value={itemValue} userValue={userValue} />
				</Combobox.Root>
			);
			const { container, rerender } = render(value("Apple", "Ap"));
			rerender(value("Kiwi", "Ap"));
			const slices = container.querySelectorAll('[data-slot="combobox-item-value"] > span');
			expect(Array.from(slices, (span) => span.textContent)).toEqual(["Kiwi"]);
		});
	});

	describe("Combobox.ContentFooter", () => {
		const Releases = ({ onLoadMore }: { onLoadMore?: () => void }) => (
			<>
				<Combobox.Root>
					<Combobox.Input aria-label="Release" />
					<Combobox.Content>
						<Combobox.Item value="v1.2.0" />
						<Combobox.Item value="v1.1.0" />
						<Combobox.ContentFooter>
							<label>
								<input type="checkbox" /> Show expired
							</label>
							<button type="button" onClick={onLoadMore}>
								Load more
							</button>
						</Combobox.ContentFooter>
					</Combobox.Content>
				</Combobox.Root>
				<button type="button">Next field</button>
			</>
		);

		test("renders its controls after the listbox, not in it", async () => {
			const user = userEvent.setup();
			render(<Releases />);
			await user.click(screen.getByRole("combobox", { name: "Release" }));

			const listbox = screen.getByRole("listbox");
			const loadMore = screen.getByRole("button", { name: "Load more" });
			expect(listbox).not.toContainElement(loadMore);
			expect(loadMore.closest('[data-slot~="combobox-content-footer"]')).not.toBeNull();
			expect(within(listbox).getAllByRole("option")).toHaveLength(2);
		});

		test("Content's props, such as aria-busy, stay on the listbox", async () => {
			const user = userEvent.setup();
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Release" />
					<Combobox.Content aria-busy className="max-h-80">
						<Combobox.Item value="v1.2.0" />
					</Combobox.Content>
				</Combobox.Root>,
			);
			await user.click(screen.getByRole("combobox", { name: "Release" }));

			const listbox = screen.getByRole("listbox");
			expect(listbox).toHaveAttribute("aria-busy", "true");
			expect(listbox).toHaveAttribute("data-slot", "combobox-content");
		});

		test("Tab moves into the footer and keeps the list open, Shift+Tab returns to the input", async () => {
			const user = userEvent.setup();
			const onLoadMore = vi.fn<() => void>();
			render(<Releases onLoadMore={onLoadMore} />);
			const input = screen.getByRole("combobox", { name: "Release" });

			await user.click(input);
			await user.tab();
			expect(screen.getByRole("checkbox", { name: "Show expired" })).toHaveFocus();
			expect(input).toHaveAttribute("aria-expanded", "true");

			await user.tab();
			await user.keyboard("{Enter}");
			expect(onLoadMore).toHaveBeenCalledTimes(1);
			expect(input).toHaveAttribute("aria-expanded", "true");

			await user.tab({ shift: true });
			await user.tab({ shift: true });
			expect(input).toHaveFocus();
			expect(input).toHaveAttribute("aria-expanded", "true");
			await user.keyboard("{ArrowDown}");
			expect(input).toHaveAttribute(
				"aria-activedescendant",
				screen.getByRole("option", { name: "v1.1.0" }).id,
			);
		});

		test("with asChild and a footer, the consumer's element is the listbox", async () => {
			const user = userEvent.setup();
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Release" />
					<Combobox.Content asChild>
						<section aria-label="Releases">
							<Combobox.Item value="v1.2.0" />
							<Combobox.ContentFooter>
								<button type="button">Load more</button>
							</Combobox.ContentFooter>
						</section>
					</Combobox.Content>
				</Combobox.Root>,
			);
			await user.click(screen.getByRole("combobox", { name: "Release" }));

			const listbox = screen.getByRole("listbox", { name: "Releases" });
			expect(listbox.tagName).toBe("SECTION");
			expect(within(listbox).getByRole("option", { name: "v1.2.0" })).toBeInTheDocument();
			expect(listbox).not.toContainElement(screen.getByRole("button", { name: "Load more" }));
		});

		test("Tab skips an option rendered as a link and moves to the footer", async () => {
			const user = userEvent.setup();
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Page" />
					<Combobox.Content>
						<Combobox.Item value="Settings" asChild>
							<a href="#settings">Settings</a>
						</Combobox.Item>
						<Combobox.ContentFooter>
							<button type="button">Load more</button>
						</Combobox.ContentFooter>
					</Combobox.Content>
				</Combobox.Root>,
			);

			await user.click(screen.getByRole("combobox", { name: "Page" }));
			await user.tab();

			expect(screen.getByRole("button", { name: "Load more" })).toHaveFocus();
		});

		test("Escape in the footer closes the list and returns focus to the input", async () => {
			const user = userEvent.setup();
			render(<Releases />);
			const input = screen.getByRole("combobox", { name: "Release" });

			await user.click(input);
			await user.tab();
			await user.keyboard("{Escape}");

			expect(input).toHaveAttribute("aria-expanded", "false");
			expect(input).toHaveFocus();
		});

		test("Tab from the last footer control moves to the control after the field and closes the list", async () => {
			const user = userEvent.setup();
			render(<Releases />);
			const input = screen.getByRole("combobox", { name: "Release" });

			await user.click(input);
			await user.tab();
			await user.tab();
			await user.tab();

			expect(screen.getByRole("button", { name: "Next field" })).toHaveFocus();
			expect(input).toHaveAttribute("aria-expanded", "false");
		});

		test("with no footer, Tab leaves the field and closes the list", async () => {
			const user = userEvent.setup();
			render(
				<>
					<Combobox.Root>
						<Combobox.Input aria-label="Fruit" />
						<Combobox.Content>
							<Combobox.Item value="Apple" />
						</Combobox.Content>
					</Combobox.Root>
					<button type="button">Next field</button>
				</>,
			);
			const input = screen.getByRole("combobox", { name: "Fruit" });

			await user.click(input);
			await user.tab();

			expect(screen.getByRole("button", { name: "Next field" })).toHaveFocus();
			expect(input).toHaveAttribute("aria-expanded", "false");
		});
	});

	describe("forms", () => {
		const Fruits = (props: { name?: string; required?: boolean; defaultValue?: string }) => (
			<form aria-label="fruit form">
				<Combobox.Root {...props}>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content>
						<Combobox.Item value="Apple" />
						<Combobox.Item value="Banana" />
					</Combobox.Content>
				</Combobox.Root>
				<button type="reset">Reset</button>
			</form>
		);
		const fruitForm = () => screen.getByRole<HTMLFormElement>("form", { name: "fruit form" });

		test("the picked value submits under name, and the typed text does not", async () => {
			const user = userEvent.setup();
			render(<Fruits name="fruit" />);
			const input = screen.getByRole("combobox", { name: "Fruit" });
			await user.type(input, "Ban");
			expect(new FormData(fruitForm()).get("fruit")).toBe("");
			await user.click(screen.getByRole("option", { name: "Banana" }));
			expect(input).toHaveValue("Banana");
			expect([...new FormData(fruitForm()).entries()]).toEqual([["fruit", "Banana"]]);
		});

		test("a form reset returns the pick and the text to their defaults", async () => {
			const user = userEvent.setup();
			render(<Fruits name="fruit" defaultValue="Apple" />);
			const input = screen.getByRole("combobox", { name: "Fruit" });
			await user.click(input);
			await user.click(screen.getByRole("option", { name: "Banana" }));
			await user.click(screen.getByRole("button", { name: "Reset" }));
			expect(input).toHaveValue("");
			expect(new FormData(fruitForm()).get("fruit")).toBe("Apple");
		});

		test("required blocks the submit until an item is picked, with or without a name", async () => {
			const user = userEvent.setup();
			render(<Fruits required />);
			expect(fruitForm().checkValidity()).toBe(false);
			const input = screen.getByRole("combobox", { name: "Fruit" });
			await user.type(input, "Apple");
			expect(fruitForm().checkValidity()).toBe(false);
			await user.keyboard("{Enter}");
			expect(fruitForm().checkValidity()).toBe(true);
		});

		test("with a Root name, only the pick submits, not the typed text", async () => {
			const user = userEvent.setup();
			render(
				<form aria-label="fruit form">
					<Combobox.Root name="fruit">
						<Combobox.Input aria-label="Fruit" name="fruit" />
						<Combobox.Content>
							<Combobox.Item value="Apple" />
						</Combobox.Content>
					</Combobox.Root>
				</form>,
			);
			await user.type(screen.getByRole("combobox", { name: "Fruit" }), "App");
			expect(new FormData(fruitForm()).getAll("fruit")).toEqual([""]);
		});

		test("a disabled combobox neither submits nor blocks the form", () => {
			render(
				<form aria-label="fruit form">
					<Combobox.Root name="fruit" required disabled defaultValue="Apple">
						<Combobox.Input aria-label="Fruit" />
					</Combobox.Root>
				</form>,
			);
			expect(screen.getByRole("combobox", { name: "Fruit" })).toBeDisabled();
			expect(new FormData(fruitForm()).getAll("fruit")).toEqual([]);
			expect(fruitForm().checkValidity()).toBe(true);
		});

		test("a failed required check lands focus on the visible input", () => {
			render(<Fruits name="fruit" required />);
			const hidden = fruitForm().querySelector<HTMLInputElement>('input[name="fruit"]');
			act(() => {
				hidden?.focus();
			});
			expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveFocus();
		});

		test("a reset of the form that Root's form names restores the defaults", async () => {
			const user = userEvent.setup();
			render(
				<>
					<form id="outside" aria-label="outside">
						<button type="reset">Reset</button>
					</form>
					<Combobox.Root form="outside" name="fruit" defaultValue="Apple" defaultInputValue="App">
						<Combobox.Input aria-label="Fruit" />
						<Combobox.Content>
							<Combobox.Item value="Apple" />
							<Combobox.Item value="Banana" />
						</Combobox.Content>
					</Combobox.Root>
				</>,
			);
			const input = screen.getByRole("combobox", { name: "Fruit" });
			await user.clear(input);
			await user.type(input, "Ban");
			await user.click(screen.getByRole("option", { name: "Banana" }));
			await user.click(screen.getByRole("button", { name: "Reset" }));
			expect(input).toHaveValue("App");
			const outside = screen.getByRole<HTMLFormElement>("form", { name: "outside" });
			expect(new FormData(outside).get("fruit")).toBe("Apple");
		});

		test("Enter runs the item's own onClick, so a preventDefault there cancels the pick", async () => {
			const user = userEvent.setup();
			const onClick = vi.fn<(event: unknown) => void>();
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content>
						<Combobox.Item
							value="Apple"
							onClick={(event) => {
								onClick(event);
								event.preventDefault();
							}}
						/>
					</Combobox.Content>
				</Combobox.Root>,
			);
			const input = screen.getByRole("combobox", { name: "Fruit" });
			await user.click(input);
			await user.keyboard("{Enter}");
			expect(onClick).toHaveBeenCalledTimes(1);
			expect(input).toHaveValue("");
		});

		test("the picked item carries data-selected, and aria-selected follows the highlight", async () => {
			const user = userEvent.setup();
			render(<Fruits defaultValue="Banana" />);
			await user.click(screen.getByRole("combobox", { name: "Fruit" }));
			const apple = screen.getByRole("option", { name: "Apple" });
			const banana = screen.getByRole("option", { name: "Banana" });
			expect(apple).toHaveAttribute("aria-selected", "true");
			expect(apple).not.toHaveAttribute("data-selected");
			expect(banana).toHaveAttribute("data-selected", "");
			expect(banana).not.toHaveAttribute("aria-selected");
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

		test("a list that opens from defaultOpen focuses the input, so Escape closes it", async () => {
			const user = userEvent.setup();
			render(
				<Combobox.Root defaultOpen>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content>
						<Combobox.Item value="Apple" />
					</Combobox.Content>
				</Combobox.Root>,
			);
			const input = screen.getByRole("combobox", { name: "Fruit" });
			await screen.findByRole("option", { name: "Apple" });
			expect(input).toHaveFocus();
			await user.keyboard("{Escape}");
			expect(input).toHaveAttribute("aria-expanded", "false");
		});

		test("Shift with an arrow selects text and leaves the list closed", async () => {
			const user = userEvent.setup();
			render(
				<Combobox.Root defaultInputValue="Apple">
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content>
						<Combobox.Item value="Apple" />
					</Combobox.Content>
				</Combobox.Root>,
			);
			const input = screen.getByRole("combobox", { name: "Fruit" });
			act(() => {
				input.focus();
			});
			await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
			expect(input).toHaveAttribute("aria-expanded", "false");
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
					<Combobox.Root value={fruit}>
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

describe("Combobox.Item function child", () => {
	test("renders the returned element as the option and reports the highlight", async () => {
		const user = userEvent.setup();
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Fruit" />
				<Combobox.Content>
					{["Apple", "Banana"].map((fruit) => (
						<Combobox.Item key={fruit} value={fruit}>
							{(props, { highlighted }) => (
								<div {...props}>
									{fruit}
									{highlighted && <span data-testid="preview">{`${fruit} preview`}</span>}
								</div>
							)}
						</Combobox.Item>
					))}
				</Combobox.Content>
			</Combobox.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Fruit" });

		await user.click(input);
		await user.keyboard("{ArrowDown}");
		const banana = await screen.findByRole("option", { name: /Banana/ });
		await user.hover(banana);

		expect(screen.getByTestId("preview")).toHaveTextContent("Banana preview");

		await user.click(banana);

		expect(input).toHaveValue("Banana");
	});
});
