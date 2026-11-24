import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ChangeEvent, ReactNode } from "react";
import { createRef, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { findTranslatedFont, translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import * as Field from "../field/field-parts.js";
import * as Sheet from "../sheet/sheet-parts.js";
import * as MultiSelect from "./multi-select-parts.js";

const snapshotAttributes = (element: HTMLElement) =>
	new Map(Array.from(element.attributes, ({ name, value }) => [name, value]));

const restoreAttributes = (element: HTMLElement, attributes: Map<string, string>) => {
	for (const { name } of Array.from(element.attributes)) {
		if (!attributes.has(name)) {
			element.removeAttribute(name);
		}
	}

	for (const [name, value] of attributes) {
		element.setAttribute(name, value);
	}
};

/**
 * Finds a tag's option span via its remove button's aria-label, which is
 * the most reliable anchor since the span's own accessible name varies by
 * ARIA implementation.
 */
const getTagOption = (value: string): HTMLElement => {
	const removeBtn = screen.getByLabelText(`Remove ${value}`);
	const tagElement = removeBtn.closest<HTMLElement>('[role="listitem"]');
	if (tagElement == null) {
		throw new Error(`Tag option for "${value}" not found`);
	}
	return tagElement;
};

describe("MultiSelect", () => {
	test("renders the combobox input with placeholder", () => {
		render(
			<MultiSelect.Root>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues />
					<MultiSelect.Input placeholder="Select items..." />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
					<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "Select items...");
	});

	test("callback refs on MultiSelect.Trigger, MultiSelect.Tag, and MultiSelect.Content attach once while the reader types", async () => {
		const user = userEvent.setup();
		const contentRef = vi.fn<(node: HTMLDivElement | null) => void>();
		const triggerRef = vi.fn<(node: HTMLDivElement | null) => void>();
		const tagRef = vi.fn<(node: HTMLSpanElement | null) => void>();
		render(
			<MultiSelect.Root defaultValue={["apple"]}>
				<MultiSelect.Trigger ref={triggerRef}>
					<MultiSelect.TagValues>
						{(props) => <MultiSelect.Tag key={props.value} {...props} ref={tagRef} />}
					</MultiSelect.TagValues>
					<MultiSelect.Input placeholder="Select items..." />
				</MultiSelect.Trigger>
				<MultiSelect.Content ref={contentRef}>
					<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
					<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>,
		);
		await user.click(screen.getByRole("combobox"));
		const listbox = screen.getByRole("listbox");
		contentRef.mockClear();
		triggerRef.mockClear();
		tagRef.mockClear();
		await user.keyboard("an");
		// Why: a new ref callback would detach and attach the list, and place the popup again.
		expect(contentRef).not.toHaveBeenCalled();
		expect(triggerRef).not.toHaveBeenCalled();
		expect(tagRef).not.toHaveBeenCalled();
		expect(listbox).toBeInTheDocument();
	});

	test("renders selected values as tags", () => {
		render(
			<MultiSelect.Root value={["apple", "banana"]} onValueChange={() => {}}>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues />
					<MultiSelect.Input placeholder="Select items..." />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
					<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>,
		);
		expect(screen.getByText("apple")).toBeInTheDocument();
		expect(screen.getByText("banana")).toBeInTheDocument();
	});

	test("hides placeholder when values are selected", () => {
		render(
			<MultiSelect.Root value={["apple"]} onValueChange={() => {}}>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues />
					<MultiSelect.Input placeholder="Select items..." />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>,
		);
		expect(screen.getByRole("combobox")).not.toHaveAttribute("placeholder");
	});

	test("renders the tags as a named list of listitems, with no option outside a listbox", () => {
		render(
			<MultiSelect.Root value={["apple", "banana"]} onValueChange={() => {}}>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues />
					<MultiSelect.Input placeholder="Select items..." />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
					<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>,
		);
		const list = screen.getByRole("list", { name: "Selected values" });
		const tags = within(list).getAllByRole("listitem");
		expect(tags).toHaveLength(2);
		expect(within(list).getByRole("button", { name: "Remove apple" })).toBeInTheDocument();
		expect(screen.queryAllByRole("option")).toHaveLength(0);
		expect(screen.queryByRole("group")).not.toBeInTheDocument();
	});

	test("renders no tag list while nothing is selected, and honors a custom list name", () => {
		const { rerender } = render(
			<MultiSelect.Root value={[]} onValueChange={() => {}}>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues aria-label="Chosen fruits" />
					<MultiSelect.Input placeholder="Select items..." />
				</MultiSelect.Trigger>
			</MultiSelect.Root>,
		);
		expect(screen.queryByRole("list")).not.toBeInTheDocument();

		rerender(
			<MultiSelect.Root value={["apple"]} onValueChange={() => {}}>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues aria-label="Chosen fruits" />
					<MultiSelect.Input placeholder="Select items..." />
				</MultiSelect.Trigger>
			</MultiSelect.Root>,
		);
		expect(screen.getByRole("list", { name: "Chosen fruits" })).toBeInTheDocument();
	});

	test("a hidden dismiss button outside the listbox closes the open list", async () => {
		const user = userEvent.setup();
		render(
			<MultiSelect.Root>
				<MultiSelect.Trigger>
					<MultiSelect.Input aria-label="Fruits" />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>,
		);
		await user.click(screen.getByRole("combobox", { name: "Fruits" }));
		const dismiss = screen.getByRole("button", { name: "Dismiss popup" });
		expect(screen.getByRole("listbox")).not.toContainElement(dismiss);

		await user.click(dismiss);

		expect(screen.queryByRole("listbox")).toBeNull();
	});

	test("renders the empty state when popover is open", () => {
		render(
			<MultiSelect.Root open>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues />
					<MultiSelect.Input placeholder="Select items..." />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Empty>No results found</MultiSelect.Empty>
				</MultiSelect.Content>
			</MultiSelect.Root>,
		);
		expect(screen.getByText("No results found")).toBeInTheDocument();
	});

	test("inside a modal sheet, portals the popover into the sheet's positioner", async () => {
		const user = userEvent.setup();
		const bodyAttributes = snapshotAttributes(document.body);
		const documentElementAttributes = snapshotAttributes(document.documentElement);
		let unmount = () => {};

		try {
			({ unmount } = render(
				<Sheet.Root open>
					<Sheet.Content>
						<Sheet.Header>
							<Sheet.Title>Test Sheet</Sheet.Title>
						</Sheet.Header>
						<MultiSelect.Root>
							<MultiSelect.Trigger>
								<MultiSelect.TagValues />
								<MultiSelect.Input placeholder="Select items..." />
							</MultiSelect.Trigger>
							<MultiSelect.Content>
								<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
								<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
							</MultiSelect.Content>
						</MultiSelect.Root>
					</Sheet.Content>
				</Sheet.Root>,
			));

			await user.click(screen.getByRole("combobox"));
			const listbox = await screen.findByRole("listbox");
			const positioner = screen.getByRole("combobox").closest('[data-slot~="sheet-positioner"]');

			expect(positioner?.contains(listbox)).toBe(true);

			await user.click(within(listbox).getByRole("option", { name: /Apple/ }));
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
		} finally {
			unmount();
			restoreAttributes(document.body, bodyAttributes);
			restoreAttributes(document.documentElement, documentElementAttributes);
		}
	});

	describe("typeahead filtering", () => {
		test("Root reports each keystroke through onInputValueChange and Input still calls onChange", async () => {
			const user = userEvent.setup();
			const onInputValueChange = vi.fn<(value: string) => void>();
			const onChange = vi.fn<(event: ChangeEvent<HTMLInputElement>) => void>();
			render(
				<MultiSelect.Root onInputValueChange={onInputValueChange}>
					<MultiSelect.Trigger>
						<MultiSelect.TagValues />
						<MultiSelect.Input onChange={onChange} placeholder="Select items..." />
					</MultiSelect.Trigger>
					<MultiSelect.Content>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
						<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
					</MultiSelect.Content>
				</MultiSelect.Root>,
			);

			await user.type(screen.getByRole("combobox"), "ban");

			// One call per keystroke, with the whole input value, not the typed char.
			expect(onInputValueChange.mock.calls).toEqual([["b"], ["ba"], ["ban"]]);
			// The raw event handler is composed, not replaced.
			expect(onChange).toHaveBeenCalledTimes(3);
			expect(onChange.mock.lastCall?.[0].target).toBe(screen.getByRole("combobox"));
		});

		/**
		 * The documented filtering shape: the consumer owns the query and the
		 * rendered items, driven entirely by `onInputValueChange`.
		 */
		const FilteringSubject = () => {
			const [query, setQuery] = useState("");
			const matches = ["Apple", "Banana", "Cherry"].filter((fruit) =>
				fruit.toLowerCase().includes(query.trim().toLowerCase()),
			);

			return (
				<MultiSelect.Root onInputValueChange={setQuery}>
					<MultiSelect.Trigger>
						<MultiSelect.TagValues />
						<MultiSelect.Input placeholder="Select items..." />
					</MultiSelect.Trigger>
					<MultiSelect.Content>
						{matches.length === 0 && <MultiSelect.Empty>No results found</MultiSelect.Empty>}
						{matches.map((fruit) => (
							<MultiSelect.Item key={fruit} value={fruit.toLowerCase()}>
								{fruit}
							</MultiSelect.Item>
						))}
					</MultiSelect.Content>
				</MultiSelect.Root>
			);
		};

		test("filtering the items from onInputValueChange narrows the listbox and reveals Empty", async () => {
			const user = userEvent.setup();
			render(<FilteringSubject />);

			const input = screen.getByRole("combobox");
			await user.click(input);
			const listbox = await screen.findByRole("listbox");
			expect(within(listbox).getAllByRole("option")).toHaveLength(3);

			await user.type(input, "ban");
			expect(within(listbox).getByRole("option", { name: "Banana" })).toBeInTheDocument();
			expect(within(listbox).queryByRole("option", { name: "Apple" })).not.toBeInTheDocument();
			expect(screen.queryByText("No results found")).not.toBeInTheDocument();

			await user.clear(input);
			await user.type(input, "zzz");
			expect(within(listbox).queryAllByRole("option")).toHaveLength(0);
			expect(screen.getByText("No results found")).toBeInTheDocument();
		});

		test("closing the list clears the filter text, so the field and the list agree", async () => {
			const user = userEvent.setup();
			render(<FilteringSubject />);
			const input = screen.getByRole("combobox");

			await user.type(input, "ban");
			expect(screen.getAllByRole("option")).toHaveLength(1);
			await user.keyboard("{Escape}");

			expect(input).toHaveAttribute("aria-expanded", "false");
			expect(input).toHaveValue("");
			await user.click(input);
			expect(screen.getAllByRole("option")).toHaveLength(3);
		});

		test("a blur while the list is closed keeps the text, because nothing closed", async () => {
			const user = userEvent.setup();
			render(
				<>
					<MultiSelect.Root defaultInputValue="ban">
						<MultiSelect.Trigger>
							<MultiSelect.Input aria-label="Fruit" />
						</MultiSelect.Trigger>
						<MultiSelect.Content>
							<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
						</MultiSelect.Content>
					</MultiSelect.Root>
					<button type="button">Next</button>
				</>,
			);
			const input = screen.getByRole("combobox", { name: "Fruit" });

			input.focus();
			await user.tab();

			expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
			expect(input).toHaveValue("ban");
		});
	});

	describe("trigger mousedown", () => {
		const renderTrigger = (selectedValue: string[]) =>
			render(
				<MultiSelect.Root value={selectedValue} onValueChange={() => {}}>
					<MultiSelect.Trigger data-testid="trigger">
						<MultiSelect.TagValues />
						<MultiSelect.Input placeholder="Select items..." />
					</MultiSelect.Trigger>
					<MultiSelect.Content>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
					</MultiSelect.Content>
				</MultiSelect.Root>,
			);

		test("pressing the trigger's own surface focuses the input instead of starting a selection", () => {
			renderTrigger([]);

			// `fireEvent` returns false when a handler called preventDefault. Here that
			// suppression is what stops the press from dragging a text selection.
			expect(fireEvent.mouseDown(screen.getByTestId("trigger"))).toBe(false);
			expect(screen.getByRole("combobox")).toHaveFocus();
		});

		test("pressing the input itself leaves the browser's caret placement alone", () => {
			renderTrigger([]);

			expect(fireEvent.mouseDown(screen.getByRole("combobox"))).toBe(true);
		});

		test("pressing a tag's remove button does not steal focus for the input", () => {
			renderTrigger(["apple"]);

			fireEvent.mouseDown(screen.getByLabelText("Remove apple"));
			expect(screen.getByRole("combobox")).not.toHaveFocus();
		});
	});

	describe("review fixes", () => {
		const Fruits = ({ disabled, form }: { disabled?: boolean; form?: string }) => (
			<MultiSelect.Root defaultValue={["apple", "banana"]}>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues />
					<MultiSelect.Input aria-label="Fruits" name="fruits" form={form} disabled={disabled} />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
					<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>
		);

		test("Escape on a tag closes the list, and so does focus that leaves a tag", async () => {
			const user = userEvent.setup();
			render(<Fruits />);
			const input = screen.getByRole("combobox", { name: "Fruits" });
			await user.click(input);
			await user.keyboard("{ArrowLeft}");
			expect(input).toHaveAttribute("aria-expanded", "true");
			await user.keyboard("{Escape}");
			expect(input).toHaveAttribute("aria-expanded", "false");

			await user.keyboard("{ArrowLeft}");
			expect(input).toHaveAttribute("aria-expanded", "true");
			act(() => {
				if (document.activeElement instanceof HTMLElement) {
					document.activeElement.blur();
				}
			});
			expect(input).toHaveAttribute("aria-expanded", "false");
		});

		test("Tab reaches a footer control, Shift+Tab returns to the input, and focus that leaves closes the list", async () => {
			const user = userEvent.setup();
			render(
				<MultiSelect.Root>
					<MultiSelect.Trigger>
						<MultiSelect.Input aria-label="Fruits" />
					</MultiSelect.Trigger>
					<MultiSelect.Content>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
						<MultiSelect.ContentFooter>
							<input type="hidden" name="action" value="upgrade" />
							<button type="button">Upgrade</button>
						</MultiSelect.ContentFooter>
					</MultiSelect.Content>
				</MultiSelect.Root>,
			);
			const input = screen.getByRole("combobox", { name: "Fruits" });
			await user.click(input);
			await user.keyboard("{Tab}");
			const upgrade = screen.getByRole("button", { name: "Upgrade" });
			expect(upgrade).toHaveFocus();
			// Why: a listbox holds only options and groups, so the footer renders after it.
			expect(screen.getByRole("listbox")).not.toContainElement(upgrade);
			expect(input).toHaveAttribute("aria-expanded", "true");
			await user.keyboard("{Shift>}{Tab}{/Shift}");
			expect(input).toHaveFocus();
			expect(input).toHaveAttribute("aria-expanded", "true");
			await user.keyboard("{Tab}");
			expect(upgrade).toHaveFocus();
			act(() => {
				upgrade.blur();
			});
			expect(input).toHaveAttribute("aria-expanded", "false");

			await user.click(input);
			await user.keyboard("{Tab}");
			await user.keyboard("{Escape}");
			expect(input).toHaveAttribute("aria-expanded", "false");
			expect(input).toHaveFocus();
		});

		test("an Escape that Content's onKeyDown cancels keeps the list open", async () => {
			const user = userEvent.setup();
			render(
				<MultiSelect.Root>
					<MultiSelect.Trigger>
						<MultiSelect.Input aria-label="Fruits" />
					</MultiSelect.Trigger>
					<MultiSelect.Content
						onKeyDown={(event) => {
							if (event.key === "Escape") {
								event.preventDefault();
							}
						}}
					>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
						<MultiSelect.ContentFooter>
							<button type="button">Upgrade</button>
						</MultiSelect.ContentFooter>
					</MultiSelect.Content>
				</MultiSelect.Root>,
			);
			const input = screen.getByRole("combobox", { name: "Fruits" });
			await user.click(input);
			await user.tab();
			await user.keyboard("{Escape}");

			expect(screen.getByRole("button", { name: "Upgrade" })).toHaveFocus();
			expect(input).toHaveAttribute("aria-expanded", "true");
		});

		test("the submitted values follow the input's form and disabled", () => {
			const { unmount } = render(
				<>
					<form id="external" aria-label="external" />
					<Fruits form="external" />
				</>,
			);
			const external = screen.getByRole<HTMLFormElement>("form", { name: "external" });
			expect(new FormData(external).getAll("fruits")).toEqual(["apple", "banana"]);
			unmount();

			render(
				<form aria-label="disabled">
					<Fruits disabled />
				</form>,
			);
			const form = screen.getByRole<HTMLFormElement>("form", { name: "disabled" });
			expect(new FormData(form).getAll("fruits")).toEqual([]);
		});
	});

	describe("keyboard navigation", () => {
		/**
		 * Stateful wrapper for keyboard nav tests. It uses useState so that
		 * removeValue calls actually update the rendered tag list.
		 */
		const Subject = ({
			initialValues = ["apple", "banana", "cherry"],
		}: {
			initialValues?: string[];
		}) => {
			const [values, setValues] = useState(initialValues);
			return (
				<MultiSelect.Root value={values} onValueChange={setValues}>
					<MultiSelect.Trigger>
						<MultiSelect.TagValues />
						<MultiSelect.Input placeholder="Select items..." />
					</MultiSelect.Trigger>
					<MultiSelect.Content>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
						<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
						<MultiSelect.Item value="cherry">Cherry</MultiSelect.Item>
					</MultiSelect.Content>
				</MultiSelect.Root>
			);
		};

		/**
		 * Waits for one rAF tick after the component's rAF has already been
		 * scheduled. Because the browser/happy-dom processes rAF callbacks
		 * FIFO, this resolves only after the focusTag callback has fired.
		 * Wrapped in act() so any resulting React state updates are flushed.
		 */
		const waitForRaf = () =>
			act(
				() =>
					new Promise<void>((resolve) => {
						requestAnimationFrame(() => {
							resolve();
						});
					}),
			);

		test("ArrowLeft from input focuses the first tag to the left of the input", async () => {
			const user = userEvent.setup();
			render(<Subject />);
			await user.click(screen.getByRole("combobox"));
			await user.keyboard("{ArrowLeft}");
			expect(getTagOption("cherry")).toHaveFocus();
		});

		test("moving focus to a tag keeps the popover open and still reports the blur", async () => {
			// Why: the blur handler reads the tag through a `closest` selector, and a
			// selector that throws skips `store.show()` and the consumer's `onBlur`.
			const user = userEvent.setup();
			const handleBlur = vi.fn<() => void>();
			render(
				<MultiSelect.Root value={["apple", "banana"]} onValueChange={() => {}}>
					<MultiSelect.Trigger>
						<MultiSelect.TagValues />
						<MultiSelect.Input placeholder="Select items..." onBlur={handleBlur} />
					</MultiSelect.Trigger>
					<MultiSelect.Content>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
						<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
					</MultiSelect.Content>
				</MultiSelect.Root>,
			);
			await user.click(screen.getByRole("combobox"));
			await user.keyboard("{Escape}");
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

			await user.keyboard("{ArrowLeft}");

			expect(getTagOption("banana")).toHaveFocus();
			expect(handleBlur).toHaveBeenCalledTimes(1);
			expect(await screen.findByRole("listbox")).toBeInTheDocument();
		});

		test("a focused tag uses DOM focus as its state, never aria-current or data-active", async () => {
			const user = userEvent.setup();
			render(<Subject />);
			const cherry = getTagOption("cherry");

			act(() => {
				cherry.focus();
			});
			expect(cherry).toHaveFocus();
			expect(cherry).not.toHaveAttribute("data-active");
			// Why: `aria-current` names the current item in a set, not keyboard focus.
			expect(cherry).not.toHaveAttribute("aria-current");

			await user.keyboard("{ArrowRight}");
			expect(screen.getByRole("combobox")).toHaveFocus();
			expect(cherry).not.toHaveFocus();
		});

		test("ArrowLeft on a non-first tag focuses the previous tag", async () => {
			const user = userEvent.setup();
			render(<Subject />);
			getTagOption("banana").focus();
			await user.keyboard("{ArrowLeft}");
			expect(getTagOption("apple")).toHaveFocus();
		});

		test("ArrowLeft on the first tag does not move focus", async () => {
			const user = userEvent.setup();
			render(<Subject />);
			getTagOption("apple").focus();
			await user.keyboard("{ArrowLeft}");
			expect(getTagOption("apple")).toHaveFocus();
		});

		test("ArrowRight on a non-last tag focuses the next tag", async () => {
			const user = userEvent.setup();
			render(<Subject />);
			getTagOption("apple").focus();
			await user.keyboard("{ArrowRight}");
			expect(getTagOption("banana")).toHaveFocus();
		});

		test("ArrowRight on the last tag focuses the input", async () => {
			const user = userEvent.setup();
			render(<Subject />);
			getTagOption("cherry").focus();
			await user.keyboard("{ArrowRight}");
			expect(screen.getByRole("combobox")).toHaveFocus();
		});

		for (const key of ["ArrowDown", "ArrowUp"] as const) {
			test(`${key} on a tag hands the key to the input instead of scrolling the page`, async () => {
				render(<Subject />);
				const tag = getTagOption("banana");
				tag.focus();

				// `fireEvent` returns false when a handler called preventDefault. That
				// suppression is what keeps the page from scrolling under the popover.
				expect(fireEvent.keyDown(tag, { key })).toBe(false);
				expect(screen.getByRole("combobox")).toHaveFocus();
				// Focusing the input is what puts the option list in front of the user.
				expect(await screen.findByRole("listbox")).toBeInTheDocument();
			});
		}

		test("Backspace on an empty input removes the last tag", async () => {
			const user = userEvent.setup();
			render(<Subject />);
			await user.click(screen.getByRole("combobox"));
			await user.keyboard("{Backspace}");
			expect(screen.queryByLabelText("Remove cherry")).not.toBeInTheDocument();
			// Why: no focus or option changes, so only the status says which value went.
			expect(screen.getByRole("status")).toHaveTextContent("Removed cherry");
		});

		test("a removal that a controlled value rejects says nothing", async () => {
			const user = userEvent.setup();
			render(
				<MultiSelect.Root value={["apple"]}>
					<MultiSelect.Trigger>
						<MultiSelect.TagValues />
						<MultiSelect.Input placeholder="Select items..." />
					</MultiSelect.Trigger>
					<MultiSelect.Content>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
					</MultiSelect.Content>
				</MultiSelect.Root>,
			);
			await user.click(screen.getByRole("combobox"));
			await user.keyboard("{Backspace}");
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
			expect(screen.getByRole("status")).toBeEmptyDOMElement();
		});

		test("Backspace on the first tag with remaining tags focuses the new first tag", async () => {
			const user = userEvent.setup();
			render(<Subject />);
			getTagOption("apple").focus();
			await user.keyboard("{Backspace}");
			await waitForRaf();
			expect(screen.queryByLabelText("Remove apple")).not.toBeInTheDocument();
			expect(getTagOption("banana")).toHaveFocus();
		});

		test("Backspace on the only tag focuses the input", async () => {
			const user = userEvent.setup();
			render(<Subject initialValues={["apple"]} />);
			getTagOption("apple").focus();
			await user.keyboard("{Backspace}");
			await waitForRaf();
			expect(screen.queryByLabelText("Remove apple")).not.toBeInTheDocument();
			expect(screen.getByRole("combobox")).toHaveFocus();
		});

		test("Backspace on a non-first tag focuses the previous tag", async () => {
			const user = userEvent.setup();
			render(<Subject />);
			getTagOption("banana").focus();
			await user.keyboard("{Backspace}");
			await waitForRaf();
			expect(screen.queryByLabelText("Remove banana")).not.toBeInTheDocument();
			expect(getTagOption("apple")).toHaveFocus();
		});

		test("Delete on a non-last tag focuses the tag that slides into its index", async () => {
			const user = userEvent.setup();
			render(<Subject />);
			getTagOption("apple").focus();
			await user.keyboard("{Delete}");
			await waitForRaf();
			expect(screen.queryByLabelText("Remove apple")).not.toBeInTheDocument();
			expect(getTagOption("banana")).toHaveFocus();
		});

		test("Delete on the last tag focuses the input", async () => {
			const user = userEvent.setup();
			render(<Subject />);
			getTagOption("cherry").focus();
			await user.keyboard("{Delete}");
			await waitForRaf();
			expect(screen.queryByLabelText("Remove cherry")).not.toBeInTheDocument();
			expect(screen.getByRole("combobox")).toHaveFocus();
		});
	});

	describe("locked values", () => {
		// Why hoisted items: a memoized or compiled consumer keeps one element per `Item`
		// across renders. React bails out of the render on that identity, so the lock must
		// reach the `Item` through context, not through a parent re-render.
		const hoistedItems = (
			<>
				<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
				<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
			</>
		);

		const LockableSubject = ({
			initialValues = ["apple"],
			lockedValues = [],
		}: {
			initialValues?: string[];
			lockedValues?: string[];
		}) => {
			const [values, setValues] = useState(initialValues);
			return (
				<MultiSelect.Root value={values} onValueChange={setValues}>
					<MultiSelect.Trigger>
						<MultiSelect.TagValues lockedValues={lockedValues} />
						<MultiSelect.Input placeholder="Select items..." />
					</MultiSelect.Trigger>
					<MultiSelect.Content>{hoistedItems}</MultiSelect.Content>
				</MultiSelect.Root>
			);
		};

		const getAppleOption = () =>
			within(screen.getByRole("listbox")).getByRole("option", { name: "Apple" });

		// Red if a disabled item runs its onClick, so an action row acts while it is disabled.
		test("a disabled item ignores a click and does not run its onClick", async () => {
			const user = userEvent.setup();
			const onClick = vi.fn<() => void>();
			render(
				<MultiSelect.Root>
					<MultiSelect.Trigger>
						<MultiSelect.Input aria-label="Fruits" />
					</MultiSelect.Trigger>
					<MultiSelect.Content>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
						<MultiSelect.Item value="banana" disabled onClick={onClick}>
							Banana
						</MultiSelect.Item>
					</MultiSelect.Content>
				</MultiSelect.Root>,
			);

			await user.click(screen.getByRole("combobox", { name: "Fruits" }));
			const banana = await screen.findByRole("option", { name: "Banana" });
			await user.click(banana);

			expect(onClick).toHaveBeenCalledTimes(0);
			expect(banana).toHaveAttribute("aria-selected", "false");
		});

		test("a disabled asChild link runs no handler of its own and opens on neither a click nor a middle click", async () => {
			const user = userEvent.setup();
			const onLinkClick = vi.fn<() => void>();
			render(
				<MultiSelect.Root>
					<MultiSelect.Trigger>
						<MultiSelect.Input aria-label="Fruits" />
					</MultiSelect.Trigger>
					<MultiSelect.Content>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
						<MultiSelect.Item value="docs" disabled asChild>
							<a href="#docs" onClick={onLinkClick} onClickCapture={onLinkClick}>
								Docs
							</a>
						</MultiSelect.Item>
					</MultiSelect.Content>
				</MultiSelect.Root>,
			);

			await user.click(screen.getByRole("combobox", { name: "Fruits" }));
			const docs = await screen.findByRole("option", { name: "Docs" });

			expect(fireEvent.click(docs)).toBe(false);
			expect(
				fireEvent(docs, new MouseEvent("auxclick", { bubbles: true, cancelable: true, button: 1 })),
			).toBe(false);
			expect(onLinkClick).toHaveBeenCalledTimes(0);
			expect(docs).toHaveAttribute("aria-selected", "false");
		});

		test("locking a value while the popover is open keeps its item selected on click", async () => {
			const user = userEvent.setup();
			const { rerender } = render(<LockableSubject />);
			await user.click(screen.getByRole("combobox"));
			await screen.findByRole("listbox");
			expect(getAppleOption()).toHaveAttribute("aria-selected", "true");

			rerender(<LockableSubject lockedValues={["apple"]} />);

			await user.click(getAppleOption());
			expect(getAppleOption()).toHaveAttribute("aria-selected", "true");
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
		});

		test("unlocking a value while the popover is open lets a click deselect its item", async () => {
			const user = userEvent.setup();
			const { rerender } = render(<LockableSubject lockedValues={["apple"]} />);
			await user.click(screen.getByRole("combobox"));
			await screen.findByRole("listbox");
			expect(getAppleOption()).toHaveAttribute("aria-selected", "true");

			rerender(<LockableSubject lockedValues={[]} />);

			await user.click(getAppleOption());
			expect(getAppleOption()).toHaveAttribute("aria-selected", "false");
			expect(screen.queryByLabelText("Remove apple")).not.toBeInTheDocument();
		});

		test("Backspace on an empty input removes the last tag once it is unlocked", async () => {
			const user = userEvent.setup();
			const { rerender } = render(<LockableSubject lockedValues={["apple"]} />);
			await user.click(screen.getByRole("combobox"));
			await user.keyboard("{Backspace}");
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();

			rerender(<LockableSubject lockedValues={[]} />);

			await user.keyboard("{Backspace}");
			expect(screen.queryByLabelText("Remove apple")).not.toBeInTheDocument();
		});

		test("unmounting TagValues releases its locks in the popover", async () => {
			const user = userEvent.setup();
			const Subject = ({ showTags }: { showTags: boolean }) => {
				const [values, setValues] = useState(["apple"]);
				return (
					<MultiSelect.Root value={values} onValueChange={setValues}>
						<MultiSelect.Trigger>
							{showTags && <MultiSelect.TagValues lockedValues={["apple"]} />}
							<MultiSelect.Input placeholder="Select items..." />
						</MultiSelect.Trigger>
						<MultiSelect.Content>{hoistedItems}</MultiSelect.Content>
					</MultiSelect.Root>
				);
			};
			const { rerender } = render(<Subject showTags />);
			await user.click(screen.getByRole("combobox"));
			await screen.findByRole("listbox");

			rerender(<Subject showTags={false} />);

			await user.click(getAppleOption());
			expect(getAppleOption()).toHaveAttribute("aria-selected", "false");
		});

		test("a lock reaches an Item that renders before TagValues", async () => {
			const user = userEvent.setup();
			// Why `open` and this order: the `Item` renders ahead of `TagValues`, so it
			// reads a lock that `TagValues` publishes after the `Item` mounted.
			const Subject = () => {
				const [values, setValues] = useState(["apple"]);
				return (
					<MultiSelect.Root open value={values} onValueChange={setValues}>
						<MultiSelect.Content>{hoistedItems}</MultiSelect.Content>
						<MultiSelect.Trigger>
							<MultiSelect.TagValues lockedValues={["apple"]} />
							<MultiSelect.Input placeholder="Select items..." />
						</MultiSelect.Trigger>
					</MultiSelect.Root>
				);
			};
			render(<Subject />);
			await screen.findByRole("listbox");

			await user.click(getAppleOption());
			expect(getAppleOption()).toHaveAttribute("aria-selected", "true");
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
		});
	});

	test("unmounting TagValues drops its Backspace handler from the input", async () => {
		const user = userEvent.setup();
		const setSelectedValue = vi.fn<(value: string[]) => void>();
		const Subject = ({ showTags }: { showTags: boolean }) => (
			<MultiSelect.Root defaultValue={["apple", "banana"]} onValueChange={setSelectedValue}>
				<MultiSelect.Trigger>
					{showTags && <MultiSelect.TagValues />}
					<MultiSelect.Input placeholder="Select items..." />
				</MultiSelect.Trigger>
			</MultiSelect.Root>
		);
		const { rerender } = render(<Subject showTags />);
		expect(screen.getByLabelText("Remove banana")).toBeInTheDocument();

		rerender(<Subject showTags={false} />);

		await user.click(screen.getByRole("combobox"));
		// Why the focus guard: the zero-call assertion below also passes when the
		// keystroke never reaches the input.
		expect(screen.getByRole("combobox")).toHaveFocus();
		await user.keyboard("{Backspace}");
		expect(setSelectedValue).toHaveBeenCalledTimes(0);
	});

	describe("custom tag renderer", () => {
		const CustomSubject = ({
			initialValues,
			lockedValues = [],
		}: {
			initialValues: string[];
			lockedValues?: string[];
		}) => {
			const [values, setValues] = useState(initialValues);
			return (
				<MultiSelect.Root value={values} onValueChange={setValues}>
					<MultiSelect.Trigger>
						<MultiSelect.TagValues lockedValues={lockedValues}>
							{(props) => <MultiSelect.Tag key={props.value} {...props} />}
						</MultiSelect.TagValues>
						<MultiSelect.Input placeholder="Select items..." />
					</MultiSelect.Trigger>
					<MultiSelect.Content>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
						<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
						<MultiSelect.Item value="cherry">Cherry</MultiSelect.Item>
					</MultiSelect.Content>
				</MultiSelect.Root>
			);
		};

		test("the render props carry the lock, the focus registration, and both removal paths", async () => {
			const user = userEvent.setup();
			render(
				<CustomSubject initialValues={["apple", "banana", "cherry"]} lockedValues={["apple"]} />,
			);
			// `locked` reaches the tag
			expect(screen.getByLabelText("Remove apple")).toHaveAttribute("aria-disabled", "true");
			expect(screen.getByLabelText("Remove cherry")).not.toHaveAttribute("aria-disabled");
			// `ref` registers the tag, so ArrowLeft from the input can focus it
			await user.click(screen.getByRole("combobox"));
			await user.keyboard("{ArrowLeft}");
			expect(getTagOption("cherry")).toHaveFocus();
			// `onKeyDown` removes the focused tag
			await user.keyboard("{Backspace}");
			expect(screen.queryByLabelText("Remove cherry")).not.toBeInTheDocument();
			// `onRemove` removes the tag whose button the user clicked
			await user.click(screen.getByLabelText("Remove banana"));
			expect(screen.queryByLabelText("Remove banana")).not.toBeInTheDocument();
			expect(screen.getByLabelText("Remove apple")).toBeInTheDocument();
		});

		test("clicking a custom tag opens the popover", async () => {
			const user = userEvent.setup();
			render(<CustomSubject initialValues={["apple"]} />);
			await user.click(getTagOption("apple"));
			expect(await screen.findByRole("listbox")).toBeInTheDocument();
		});
	});

	test("given validation='error', renders trigger with data-validation='error'", () => {
		render(
			<MultiSelect.Root>
				<MultiSelect.Trigger data-testid="trigger" validation="error">
					<MultiSelect.TagValues />
					<MultiSelect.Input placeholder="Select items..." />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>,
		);
		expect(screen.getByTestId("trigger")).toHaveAttribute("data-validation", "error");
	});

	test.each([
		{ props: { validation: "error" as const }, expected: "true" },
		{ props: { "aria-invalid": true as const }, expected: "true" },
		{ props: { validation: "success" as const }, expected: "false" },
		{ props: {}, expected: "false" },
	])(
		"given $props on the trigger, the input reports aria-invalid=$expected",
		({ props, expected }) => {
			render(
				<MultiSelect.Root>
					<MultiSelect.Trigger {...props}>
						<MultiSelect.TagValues />
						<MultiSelect.Input aria-label="Fruits" />
					</MultiSelect.Trigger>
				</MultiSelect.Root>,
			);
			expect(screen.getByRole("combobox", { name: "Fruits" })).toHaveAttribute(
				"aria-invalid",
				expected,
			);
		},
	);

	test("inherits validation from Field.Item through Field.Control", () => {
		render(
			<Field.Item name="example" validation="warning">
				<MultiSelect.Root>
					<Field.Control>
						<MultiSelect.Trigger data-testid="trigger">
							<MultiSelect.TagValues />
							<MultiSelect.Input placeholder="Select items..." />
						</MultiSelect.Trigger>
					</Field.Control>
					<MultiSelect.Content>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
					</MultiSelect.Content>
				</MultiSelect.Root>
			</Field.Item>,
		);
		expect(screen.getByTestId("trigger")).toHaveAttribute("data-validation", "warning");
	});

	test("Field.Control wrapping MultiSelect.Root applies field ARIA wiring to the input", () => {
		render(
			<Field.Item name="example">
				<Field.Control>
					<MultiSelect.Root>
						<MultiSelect.Trigger>
							<MultiSelect.TagValues />
							<MultiSelect.Input
								aria-describedby="ignored-description"
								aria-errormessage="ignored-error"
								data-testid="input"
								id="ignored-input"
								name="ignored-name"
								placeholder="Select items..."
							/>
						</MultiSelect.Trigger>
						<MultiSelect.Content>
							<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
						</MultiSelect.Content>
					</MultiSelect.Root>
				</Field.Control>
				<Field.Errors data-testid="errors" messages={["Required."]} />
				<Field.Description data-testid="desc">Pick items.</Field.Description>
			</Field.Item>,
		);

		const input = screen.getByTestId("input");
		const errors = screen.getByTestId("errors");
		const description = screen.getByTestId("desc");
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(input.getAttribute("aria-describedby")).toContain(errors.id);
		expect(input.getAttribute("aria-describedby")).toContain(description.id);
		expect(input.getAttribute("aria-describedby")).not.toContain("ignored-description");
		expect(input).toHaveAttribute("aria-errormessage", errors.id);
		expect(input).not.toHaveAttribute("id", "ignored-input");
		// The field name lands on the hidden inputs that carry the selected values, not on the
		// combobox input, whose value is the typeahead filter text and never a submitted value.
		expect(input).not.toHaveAttribute("name");
	});

	test("submits the selected values under the field name, not the filter text", async () => {
		const user = userEvent.setup();
		render(
			<Field.Item name="fruits">
				<Field.Control>
					<MultiSelect.Root>
						<MultiSelect.Trigger>
							<MultiSelect.TagValues />
							<MultiSelect.Input data-testid="input" placeholder="Select items..." />
						</MultiSelect.Trigger>
						<MultiSelect.Content>
							<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
							<MultiSelect.Item value="banana">Banana</MultiSelect.Item>
						</MultiSelect.Content>
					</MultiSelect.Root>
				</Field.Control>
			</Field.Item>,
		);

		const hiddenValues = () =>
			Array.from(
				document.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="fruits"]'),
				(hidden) => hidden.value,
			);

		expect(hiddenValues()).toEqual([]);

		await user.click(screen.getByTestId("input"));
		await user.click(await screen.findByRole("option", { name: "Apple" }));
		expect(hiddenValues()).toEqual(["apple"]);

		await user.click(await screen.findByRole("option", { name: "Banana" }));
		expect(hiddenValues()).toEqual(["apple", "banana"]);
	});

	test("lets trigger validation override field validation", () => {
		render(
			<Field.Item name="example" validation="success">
				<MultiSelect.Root>
					<Field.Control>
						<MultiSelect.Trigger data-testid="trigger" validation="warning">
							<MultiSelect.TagValues />
							<MultiSelect.Input placeholder="Select items..." />
						</MultiSelect.Trigger>
					</Field.Control>
					<MultiSelect.Content>
						<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
					</MultiSelect.Content>
				</MultiSelect.Root>
			</Field.Item>,
		);
		expect(screen.getByTestId("trigger")).toHaveAttribute("data-validation", "warning");
	});
});

describe("MultiSelect.Item label slot", () => {
	function Options({ label }: { label: ReactNode }) {
		return (
			<MultiSelect.Root>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues />
					<MultiSelect.Input placeholder="Pick fruit" />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple">{label}</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>
		);
	}

	test("wraps children in a label div", async () => {
		const user = userEvent.setup();
		render(<Options label="Apple" />);
		await user.click(screen.getByRole("combobox"));

		const item = await screen.findByRole("option", { name: "Apple" });
		const label = item.querySelector('[data-slot="multi-select-item-label"]');
		expect(label).toHaveTextContent("Apple");
		expect(label?.parentElement).toBe(item);
	});

	test("keeps rendering when a translated label swaps to an element", async () => {
		const user = userEvent.setup();
		const { rerender } = render(<Options label="Apple" />);
		await user.click(screen.getByRole("combobox"));

		const item = await screen.findByRole("option", { name: "Apple" });
		translateTextNodes(item);
		expect(item).toHaveTextContent("[Apple-es]");

		rerender(<Options label={<strong>Apple</strong>} />);

		expect(findTranslatedFont(item)).toBeNull();
		expect(item.querySelector("strong")).toHaveTextContent("Apple");
	});
});

describe("MultiSelect.Item asChild", () => {
	function Options({ label }: { label: ReactNode }) {
		return (
			<MultiSelect.Root>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues />
					<MultiSelect.Input placeholder="Pick fruit" />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple" asChild>
						<a href="#apple">{label}</a>
					</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>
		);
	}

	test("slots onto the anchor, merges class, data-*, and ref, and keeps the label div inside it", async () => {
		const user = userEvent.setup();
		const ref = createRef<HTMLAnchorElement>();
		render(
			<MultiSelect.Root>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues />
					<MultiSelect.Input placeholder="Pick fruit" />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple" asChild className="mine" data-testid="custom">
						<a href="#apple" className="theirs" ref={ref}>
							Apple
						</a>
					</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>,
		);
		await user.click(screen.getByRole("combobox"));

		// Why tagName and the class check: the asChild swap renders the child element in
		// place of the default, and the tailwind-merge contract keeps both classes on it.
		const item = await screen.findByRole("option", { name: "Apple" });
		expect(item.tagName).toBe("A");
		expect(item).toHaveAttribute("href", "#apple");
		expect(item).toHaveClass("mine", "theirs");
		expect(item).toHaveAttribute("data-testid", "custom");
		expect(item).toHaveAttribute("data-slot", "multi-select-item");
		expect(ref.current).toBe(item);

		const label = item.querySelector('[data-slot="multi-select-item-label"]');
		expect(label).toHaveTextContent("Apple");
		expect(label?.parentElement).toBe(item);
		expect(Array.from(item.childNodes).every((node) => node instanceof Element)).toBe(true);
	});

	test("selects through the anchor and shows the check inside it", async () => {
		const user = userEvent.setup();
		render(<Options label="Apple" />);
		await user.click(screen.getByRole("combobox"));

		const item = await screen.findByRole("option", { name: "Apple" });
		await user.click(item);

		expect(item).toHaveAttribute("aria-selected", "true");
		expect(item.querySelector("svg")?.closest('[role="option"]')).toBe(item);
	});

	test("keeps rendering when a translated label swaps to an element", async () => {
		const user = userEvent.setup();
		const { rerender } = render(<Options label="Apple" />);
		await user.click(screen.getByRole("combobox"));

		const item = await screen.findByRole("option", { name: "Apple" });
		translateTextNodes(item);
		expect(item).toHaveTextContent("[Apple-es]");

		rerender(<Options label={<strong>Apple</strong>} />);

		expect(findTranslatedFont(item)).toBeNull();
		expect(item.querySelector("strong")).toHaveTextContent("Apple");
	});

	test("throws with the reason when the child is bare text", async () => {
		const user = userEvent.setup();
		// Why silence: React logs the error a render throws before it rethrows it.
		vi.spyOn(console, "error").mockImplementation(() => {});
		render(
			<MultiSelect.Root>
				<MultiSelect.Trigger>
					<MultiSelect.TagValues />
					<MultiSelect.Input placeholder="Pick fruit" />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple" asChild>
						Apple
					</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>,
		);

		await expect(user.click(screen.getByRole("combobox"))).rejects.toThrow(
			"When using `asChild`, MultiSelect.Item must be passed a single child as a JSX tag.",
		);
	});
});

describe("MultiSelect.Item function child", () => {
	test("renders the returned element as the option, with the label and check inside, and reports the highlight", async () => {
		const user = userEvent.setup();
		render(
			<MultiSelect.Root defaultValue={["apple"]}>
				<MultiSelect.Trigger aria-label="Fruits">
					<MultiSelect.TagValues />
					<MultiSelect.Input aria-label="Search fruits" />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					{["apple", "banana"].map((fruit) => (
						<MultiSelect.Item key={fruit} value={fruit}>
							{(props, { highlighted }) => (
								<div {...props} data-row-highlighted={String(highlighted)}>
									{fruit}
								</div>
							)}
						</MultiSelect.Item>
					))}
				</MultiSelect.Content>
			</MultiSelect.Root>,
		);

		await user.click(screen.getByRole("combobox", { name: "Search fruits" }));
		const banana = await screen.findByRole("option", { name: "banana" });
		await user.hover(banana);

		expect(banana).toHaveAttribute("data-row-highlighted", "true");
		expect(banana.querySelector("[data-slot=multi-select-item-label]")).toHaveTextContent("banana");
		expect(screen.getByRole("option", { name: "apple" }).querySelector("svg")).not.toBeNull();
	});
});
