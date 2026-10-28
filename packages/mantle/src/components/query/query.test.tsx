import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { type KeyboardEvent, type ReactNode, createRef, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { defineRemoteFilterGrammar } from "../../utils/query-filter/grammar.js";
import { type TestItem, testGrammar, testItems } from "../../utils/query-filter/test-grammar.js";
import { Field } from "../field/field.js";
import { Query, type QueryInputProps } from "./query.js";

/** Field props a test can set. The harness owns the label and the placeholder. */
type ExtraFieldProps = Partial<Omit<QueryInputProps, "placeholder">> &
	Record<`data-${string}`, string>;

/**
 * The popover with every part, the way a product composes it. Its children
 * render in the footer, after the hints.
 */
function QueryContent({ children, enterHint }: { children?: ReactNode; enterHint?: string }) {
	return (
		<Query.Content>
			<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
			<Query.Empty />
			<Query.Footer>
				<Query.Legend />
				<Query.KeyboardHints enterHint={enterHint} />
				{children}
			</Query.Footer>
		</Query.Content>
	);
}

/** Props for {@link ControlledQuery}. */
type ControlledQueryProps = {
	/** The query the input starts with. */
	initialValue: string;
	/** The items the input counts against; `null` hands the input none. */
	items: TestItem[] | null;
	/** Called with every query the input hands back. */
	onValueChange: (value: string) => void;
	/** Props for `Query.Input`. */
	fieldProps?: ExtraFieldProps;
	/** Children of `Query.Input`: the inline actions. */
	fieldChildren?: ReactNode;
	/** Content in `Query.Footer`, after the hints. */
	footer?: ReactNode;
};

/** The compound under a `useState`, the way a table hosts it, reporting every value it writes. */
function ControlledQuery({
	initialValue,
	items,
	onValueChange,
	fieldProps,
	fieldChildren,
	footer,
}: ControlledQueryProps) {
	const [value, setValue] = useState(initialValue);

	return (
		<Query.Root
			grammar={testGrammar}
			items={items ?? undefined}
			value={value}
			onValueChange={(nextValue) => {
				setValue(nextValue);
				onValueChange(nextValue);
			}}
		>
			<Query.Input
				aria-label="Filter projects"
				placeholder="Filter projects, or type a filter like name:api"
				{...fieldProps}
			>
				{fieldChildren}
			</Query.Input>
			<QueryContent>{footer}</QueryContent>
		</Query.Root>
	);
}

/** Renders the controlled compound, reporting every value it writes. */
function renderQuery({
	initialValue = "",
	items = testItems,
	fieldProps,
	fieldChildren,
	footer,
	before,
}: {
	initialValue?: string;
	items?: TestItem[] | null;
	fieldProps?: ExtraFieldProps;
	fieldChildren?: ReactNode;
	footer?: ReactNode;
	/** Rendered before the input, such as a description the input points at. */
	before?: ReactNode;
} = {}) {
	const values: string[] = [];

	render(
		<>
			{before}
			<ControlledQuery
				initialValue={initialValue}
				items={items}
				onValueChange={(value) => {
					values.push(value);
				}}
				fieldProps={fieldProps}
				fieldChildren={fieldChildren}
				footer={footer}
			/>
		</>,
	);

	// Tests focus this with `input.focus()`, never `fireEvent.focus`: a
	// synthetic focus event leaves `document.activeElement` behind.
	const input = screen.getByRole<HTMLInputElement>("combobox", { name: "Filter projects" });

	return { values, input };
}

/** Renders the compound over a grammar that another system executes. */
function renderRemoteQuery(grammar: ReturnType<typeof defineRemoteFilterGrammar>) {
	render(
		<Query.Root grammar={grammar} value="" onValueChange={() => {}}>
			<Query.Input aria-label="Search" placeholder="Search" />
			<QueryContent />
		</Query.Root>,
	);
	return screen.getByRole<HTMLInputElement>("combobox", { name: "Search" });
}

/** Types into the input, keeping the caret at the end the way a browser would. */
function type(input: HTMLElement, value: string) {
	typeWithCaret(input, value, value.length);
}

/** Types into the input with the caret parked at an explicit offset. */
function typeWithCaret(input: HTMLElement, value: string, caretIndex: number) {
	fireEvent.change(input, {
		target: { value, selectionStart: caretIndex, selectionEnd: caretIndex },
	});
}

describe("Query.Root", () => {
	test("forwards className, data attributes, and ref to its row", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Query.Root
				ref={ref}
				grammar={testGrammar}
				value=""
				onValueChange={() => {}}
				className="custom-row"
				data-testid="row"
			>
				<Query.Input aria-label="Filter projects" placeholder="Filter" />
			</Query.Root>,
		);

		const row = screen.getByTestId("row");
		expect(row).toHaveAttribute("data-slot", "query");
		expect(row).toHaveClass("custom-row");
		expect(ref.current).toBe(row);
	});

	test("merges its props, slot, and ref onto the child with asChild", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Query.Root
				asChild
				ref={ref}
				grammar={testGrammar}
				value=""
				onValueChange={() => {}}
				className="custom-row"
				data-state-hook="row"
			>
				<section aria-label="Filters" className="own-class">
					<Query.Input aria-label="Filter projects" placeholder="Filter" />
				</section>
			</Query.Root>,
		);

		const row = screen.getByRole("region", { name: "Filters" });
		expect(row).toHaveAttribute("data-slot", "query");
		expect(row).toHaveAttribute("data-state-hook", "row");
		expect(row).toHaveClass("custom-row", "own-class");
		expect(ref.current).toBe(row);
	});

	test("throws when a part renders outside it", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<Query.Input aria-label="Filter" placeholder="Filter" />)).toThrow(
			"Query.Input must be rendered inside Query.Root.",
		);
	});
});

describe("Query.Input", () => {
	test("sends className to its outer element, and ref and data attributes to the input", () => {
		const ref = createRef<HTMLInputElement>();
		const { input } = renderQuery({
			fieldProps: { ref, className: "custom-field", "data-testid": "field" },
		});

		const field = input.closest('[data-slot~="query-input"]');
		expect(field).toHaveClass("custom-field");
		expect(screen.getByTestId("field")).toBe(input);
		expect(ref.current).toBe(input);
	});

	test("disables the input and offers no suggestions", () => {
		const { input } = renderQuery({ fieldProps: { disabled: true } });

		expect(input).toBeDisabled();
		expect(input.closest('[data-slot~="input"]')).toHaveAttribute("data-disabled");

		fireEvent.click(input);
		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(input).toHaveAttribute("aria-expanded", "false");
	});

	test("offers no suggestions on a read-only input", () => {
		const { input } = renderQuery({ fieldProps: { readOnly: true } });

		input.focus();
		fireEvent.click(input);
		fireEvent.keyDown(input, { key: "ArrowDown" });

		expect(input).toHaveAttribute("readonly");
		expect(input).toHaveAttribute("aria-expanded", "false");
	});

	test("marks the input required for a hosting form", () => {
		const { input } = renderQuery({ fieldProps: { required: true } });

		expect(input).toBeRequired();
	});

	test("shows the error state on the field's box when the caller marks it invalid", () => {
		const { input } = renderQuery({ fieldProps: { validation: "error" } });

		expect(input).toBeInvalid();
		expect(input.closest('[data-slot~="input"]')).toHaveAttribute("data-validation", "error");
	});

	test("calls the caller's handlers, and a prevented keydown skips the field's own", async () => {
		const onFocus = vi.fn<() => void>();
		const onKeyDown = vi.fn<(event: KeyboardEvent<HTMLInputElement>) => void>((event) => {
			if (event.key === "ArrowDown") {
				event.preventDefault();
			}
		});
		const { input } = renderQuery({ fieldProps: { onFocus, onKeyDown } });

		input.focus();
		expect(onFocus).toHaveBeenCalledOnce();
		await screen.findByRole("listbox");

		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(onKeyDown).toHaveBeenCalledOnce();
		expect(input).not.toHaveAttribute("aria-activedescendant");
	});

	test("offers every qualifier when the empty input takes focus", async () => {
		const { input } = renderQuery();

		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		input.focus();

		const listbox = await screen.findByRole("listbox", { name: "Filter suggestions" });
		expect(
			within(listbox)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual(expect.arrayContaining(["name:Text in the project name"]));
		expect(input).toHaveAttribute("aria-expanded", "true");
		expect(input).toHaveAttribute("aria-controls", listbox.id);
	});

	test("waits for a click before it offers suggestions when focus alone must not open them", async () => {
		const { input } = renderQuery({ fieldProps: { suggestOnFocus: false } });

		input.focus();
		expect(input).toHaveFocus();
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

		fireEvent.click(input);
		expect(await screen.findByRole("listbox", { name: "Filter suggestions" })).toBeInTheDocument();
	});

	test("stays collapsed without a Query.Content to show the list", () => {
		render(
			<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
				<Query.Input aria-label="Filter projects" placeholder="Filter" />
			</Query.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Filter projects" });

		act(() => input.focus());

		expect(input).toHaveAttribute("aria-expanded", "false");
	});

	test("hands every typed query to the caller", () => {
		const { input, values } = renderQuery();

		type(input, "is:shared acme");

		expect(values).toEqual(["is:shared acme"]);
	});

	test("paints the caller's query as colored runs beside the input", () => {
		const { input } = renderQuery({ initialValue: "is:bogus" });

		expect(input).toHaveValue("is:bogus");
		// The painted copy holds one element per highlighted run, so the key and
		// its unknown value are separate elements.
		expect(screen.getByText("is")).toBeInTheDocument();
		expect(screen.getByText("bogus")).toBeInTheDocument();
		// A translated copy would drift out of line with the caret.
		expect(screen.getByText("bogus").closest("[aria-hidden]")).toHaveAttribute("translate", "no");
	});

	test("colors keys, values, and operators through their documented CSS variables", () => {
		renderQuery({ initialValue: "is:new OR acme" });

		// Spelling pins: the docs page and the Field JSDoc document these names and defaults.
		expect(screen.getByText("is")).toHaveClass(
			"text-(--query-key-color,var(--shiki-token-attribute))",
		);
		expect(screen.getByText("new")).toHaveClass(
			"text-(--query-value-color,var(--shiki-token-string))",
		);
		expect(screen.getByText("OR")).toHaveClass(
			"text-(--query-operator-color,var(--shiki-token-operator))",
		);
	});

	test("scrolls the painted copy with the input, so a long query stays aligned", () => {
		const { input } = renderQuery({ initialValue: 'description:"a long value"' });

		// happy-dom has no layout, so the test asserts the mechanism: the overlay
		// takes the scroll offset of the input.
		input.scrollLeft = 40;
		fireEvent.scroll(input);

		expect(screen.getByText("description").closest('[aria-hidden="true"]')?.scrollLeft).toBe(40);
	});

	test("clears the query and refocuses the field from its clear button", async () => {
		const { input, values } = renderQuery({ initialValue: "is:shared " });

		const clear = screen.getByRole("button", { name: "Clear filter" });
		expect(input.closest('[data-slot~="input"]')).toContainElement(clear);
		fireEvent.click(clear);

		expect(input).toHaveValue("");
		expect(values).toEqual([""]);
		expect(input).toHaveFocus();
		expect(screen.queryByRole("button", { name: "Clear filter" })).not.toBeInTheDocument();
	});

	test("shows no clear button while the query is empty", () => {
		renderQuery();

		expect(screen.queryByRole("button", { name: "Clear filter" })).not.toBeInTheDocument();
	});

	test("shows no clear button on a field the user cannot edit", () => {
		renderQuery({ initialValue: "is:shared", fieldProps: { readOnly: true } });

		expect(screen.queryByRole("button", { name: "Clear filter" })).not.toBeInTheDocument();
	});

	test("calls onClear after the clear button empties the query", () => {
		// What `onValueChange` had reported when `onClear` ran.
		const reportedAtClear: string[][] = [];
		const onClear = vi.fn<() => void>(() => reportedAtClear.push([...rendered.values]));
		const rendered = renderQuery({ initialValue: "acme", fieldProps: { onClear } });

		fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));

		expect(rendered.input).toHaveValue("");
		expect(onClear).toHaveBeenCalledOnce();
		expect(reportedAtClear).toEqual([[""]]);
	});

	test("names the clear button with clearLabel", () => {
		renderQuery({ initialValue: "acme", fieldProps: { clearLabel: "Clear search" } });

		expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
	});

	test("renders its children as inline actions inside the input's box", () => {
		const { input } = renderQuery({
			fieldChildren: <button type="button">Copy query</button>,
		});

		const action = screen.getByRole("button", { name: "Copy query" });
		expect(input.closest('[data-slot~="input"]')).toContainElement(action);
		expect(action.parentElement).toHaveAttribute("data-slot", "query-input-actions");
	});

	test("survives a swapped inline action after a translation engine rewrote it", () => {
		function Host() {
			const [label, setLabel] = useState("Clear");
			return (
				<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
					<Query.Input aria-label="Filter projects" placeholder="Filter">
						{label}
					</Query.Input>
					<button type="button" onClick={() => setLabel("Reset")}>
						Swap
					</button>
				</Query.Root>
			);
		}
		render(<Host />);

		const actions = screen.getByText("Clear").closest('[data-slot="query-input-actions"]');
		if (actions == null) {
			throw new Error("expected the inline actions wrapper");
		}
		translateTextNodes(actions);
		fireEvent.click(screen.getByRole("button", { name: "Swap" }));

		expect(actions).toHaveTextContent("Reset");
	});

	test("survives a text action that swaps to an element beside the clear button after a translation", () => {
		function Host() {
			const [swapped, setSwapped] = useState(false);
			return (
				<Query.Root grammar={testGrammar} value="acme" onValueChange={() => {}}>
					<Query.Input aria-label="Filter projects" placeholder="Filter">
						{swapped ? <strong>Saved</strong> : "Unsaved"}
					</Query.Input>
					<button type="button" onClick={() => setSwapped(true)}>
						Swap
					</button>
				</Query.Root>
			);
		}
		render(<Host />);
		expect(screen.getByRole("button", { name: "Clear filter" })).toBeInTheDocument();

		const actions = screen.getByText("Unsaved").closest('[data-slot="query-input-actions"]');
		if (actions == null) {
			throw new Error("expected the inline actions wrapper");
		}
		translateTextNodes(actions);
		fireEvent.click(screen.getByRole("button", { name: "Swap" }));

		expect(actions).toHaveTextContent("Saved");
	});

	test("keeps a field owner's description and error wiring beside the legend", async () => {
		const { input } = renderQuery({
			initialValue: "is:bogus",
			before: <p id="hint">Enter applies the filter.</p>,
			fieldProps: { id: "project-filter", "aria-describedby": "hint", "aria-invalid": true },
		});

		expect(input).toHaveAttribute("id", "project-filter");
		expect(input).toBeInvalid();
		expect(input).toHaveAccessibleDescription("Enter applies the filter.");

		input.focus();
		await screen.findByRole("listbox");

		// The legend joins the owner's description instead of replacing it.
		expect(input).toHaveAccessibleDescription(/^Enter applies the filter\. -key:value excludes/);
	});

	test("takes its id, label, and description from Field.Control", () => {
		render(
			<Field.Item name="projectFilter">
				<Field.Label>Filter projects</Field.Label>
				<Field.Control>
					<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
						<Query.Input placeholder="Filter" />
					</Query.Root>
				</Field.Control>
				<Field.Description>Type a key and a colon.</Field.Description>
			</Field.Item>,
		);

		const input = screen.getByRole("combobox", { name: "Filter projects" });
		expect(input).toHaveAttribute("name", "projectFilter");
		expect(input).toHaveAccessibleDescription("Type a key and a colon.");
	});

	test("keeps the Field.Control id on the input alone", () => {
		const { container } = render(
			<Field.Item name="projectFilter" id="project-filter">
				<Field.Label>Filter projects</Field.Label>
				<Field.Control>
					<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
						<Query.Input placeholder="Filter" />
					</Query.Root>
				</Field.Control>
			</Field.Item>,
		);

		expect(container.querySelectorAll("#project-filter")).toHaveLength(1);
		expect(container.querySelectorAll("[name=projectFilter]")).toHaveLength(1);
		expect(screen.getByLabelText("Filter projects")).toBe(screen.getByRole("combobox"));
	});

	test("keeps the Field.Item wiring over its own props inside Field.Control", () => {
		render(
			<Field.Item name="projectFilter">
				<Field.Label>Filter projects</Field.Label>
				<Field.Control>
					<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
						<Query.Input id="other" name="other" aria-describedby="other" placeholder="Filter" />
					</Query.Root>
				</Field.Control>
				<Field.Description>Type a key and a colon.</Field.Description>
			</Field.Item>,
		);

		const input = screen.getByRole("combobox", { name: "Filter projects" });
		expect(input).toHaveAttribute("name", "projectFilter");
		expect(input).toHaveAccessibleDescription("Type a key and a colon.");
	});

	test("retires the active option when the caller changes the value", async () => {
		function Host() {
			const [value, setValue] = useState("");
			return (
				<Query.Root grammar={testGrammar} value={value} onValueChange={setValue}>
					<Query.Input aria-label="Filter projects" placeholder="Filter" />
					<QueryContent />
				</Query.Root>
			);
		}
		render(<Host />);
		const input = screen.getByRole("combobox");

		input.focus();
		type(input, "is:");
		await screen.findByRole("listbox");
		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(input).toHaveAttribute("aria-activedescendant");

		fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));
		expect(input).not.toHaveAttribute("aria-activedescendant");

		fireEvent.keyDown(input, { key: "Enter" });
		expect(input).toHaveValue("");
	});

	test("new items retire the active row, so Enter cannot insert a row the user did not pick", async () => {
		function Host({ items }: { items: TestItem[] }) {
			const [value, setValue] = useState("");
			return (
				<Query.Root grammar={testGrammar} items={items} value={value} onValueChange={setValue}>
					<Query.Input aria-label="Filter projects" placeholder="Filter" />
					<QueryContent />
				</Query.Root>
			);
		}
		const { rerender } = render(<Host items={testItems} />);
		const input = screen.getByRole("combobox");

		input.focus();
		type(input, "is:");
		await screen.findByRole("listbox");
		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(input).toHaveAttribute("aria-activedescendant");

		rerender(<Host items={testItems.slice(1)} />);
		expect(input).not.toHaveAttribute("aria-activedescendant");

		fireEvent.keyDown(input, { key: "Enter" });
		expect(input).toHaveValue("is:");
	});
});

describe("Query.List and Query.Item", () => {
	test("forward className and join data-slot on the listbox and each row", async () => {
		const rows: HTMLDivElement[] = [];
		const listRef = createRef<HTMLDivElement>();
		render(
			<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
				<Query.Input aria-label="Filter projects" placeholder="Filter" />
				<Query.Content>
					<Query.List ref={listRef} className="list" data-slot="mine">
						{(suggestion) => (
							<Query.Item
								suggestion={suggestion}
								className="row"
								data-slot="mine"
								ref={(element) => {
									if (element != null) {
										rows.push(element);
									}
								}}
							/>
						)}
					</Query.List>
				</Query.Content>
			</Query.Root>,
		);

		screen.getByRole("combobox").focus();
		const listbox = await screen.findByRole("listbox", { name: "Filter suggestions" });
		const [row] = within(listbox).getAllByRole("option");

		expect(listRef.current).toBe(listbox);
		expect(listbox).toHaveClass("list");
		expect(listbox).toHaveAttribute("data-slot", "mine query-list");
		expect(row).toHaveClass("row");
		expect(row).toHaveAttribute("data-slot", "mine query-item");
		expect(rows).toContain(row);
	});

	test("renders an item's own content, and a click still inserts its suggestion", async () => {
		function Host() {
			const [value, setValue] = useState("");
			return (
				<Query.Root grammar={testGrammar} value={value} onValueChange={setValue}>
					<Query.Input aria-label="Filter" placeholder="Filter" />
					<Query.Content>
						<Query.List>
							{(suggestion) => (
								<Query.Item suggestion={suggestion}>
									<span>Add {suggestion.label}</span>
								</Query.Item>
							)}
						</Query.List>
					</Query.Content>
				</Query.Root>
			);
		}
		render(<Host />);
		const field = screen.getByRole("combobox", { name: "Filter" });

		field.focus();
		fireEvent.click(await screen.findByRole("option", { name: "Add is:" }));

		expect(field).toHaveValue("is:");
	});

	test("skips the insert when the item's onClick prevents the default", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(
			<Query.Root grammar={testGrammar} value="" onValueChange={onValueChange}>
				<Query.Input aria-label="Filter" placeholder="Filter" />
				<Query.Content>
					<Query.List>
						{(suggestion) => (
							<Query.Item suggestion={suggestion} onClick={(event) => event.preventDefault()} />
						)}
					</Query.List>
				</Query.Content>
			</Query.Root>,
		);

		screen.getByRole("combobox").focus();
		fireEvent.click(await screen.findByRole("option", { name: /^is:/ }));

		expect(onValueChange).not.toHaveBeenCalled();
	});

	test("throws for a suggestion the list did not hand it", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const suggestion = {
			section: "filters",
			label: "owner:",
			insertText: "owner:",
			completes: false,
		} as const;

		expect(() =>
			render(
				<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
					<Query.Item suggestion={suggestion} />
				</Query.Root>,
			),
		).toThrow("Query.Item takes a suggestion from the Query.List render function.");
	});
});

describe("Query.Empty", () => {
	test("shows its own message in place of the default, as the input's description", async () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Query.Root grammar={testGrammar} value="zzzz" onValueChange={() => {}}>
				<Query.Input aria-label="Filter" placeholder="Filter" />
				<Query.Content>
					<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
					<Query.Empty ref={ref} className="empty" data-slot="mine">
						Nothing to suggest
					</Query.Empty>
				</Query.Content>
			</Query.Root>,
		);
		const input = screen.getByRole("combobox");

		input.focus();
		const empty = await screen.findByText("Nothing to suggest");

		expect(ref.current).toBe(empty);
		expect(empty).toHaveClass("empty");
		expect(empty).toHaveAttribute("data-slot", "mine query-empty");
		expect(screen.queryByText(/No filter matches/)).not.toBeInTheDocument();
		expect(input).toHaveAccessibleDescription("Nothing to suggest");
	});
});

describe("Query.Footer", () => {
	test("merges its props, classes, and ref onto its child with asChild", async () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
				<Query.Input aria-label="Filter" placeholder="Filter" />
				<Query.Content>
					<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
					<Query.Footer asChild ref={ref} className="footer" data-test="footer">
						<section className="own">Filter docs</section>
					</Query.Footer>
				</Query.Content>
			</Query.Root>,
		);
		const input = screen.getByRole("combobox");

		input.focus();
		const footer = await screen.findByText("Filter docs");

		expect(footer.tagName).toBe("SECTION");
		expect(footer).toHaveClass("footer", "own");
		expect(footer).toHaveAttribute("data-slot", "query-footer");
		expect(footer).toHaveAttribute("data-test", "footer");
		expect(ref.current).toBe(footer);
		expect(input).toHaveAccessibleDescription("Filter docs");
	});

	test("keeps the input's description when its asChild child has its own id", async () => {
		render(
			<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
				<Query.Input aria-label="Filter" placeholder="Filter" />
				<Query.Content>
					<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
					<Query.Footer asChild>
						<section id="help">Filter docs</section>
					</Query.Footer>
				</Query.Content>
			</Query.Root>,
		);
		const input = screen.getByRole("combobox");

		input.focus();
		await screen.findByText("Filter docs");

		expect(input).toHaveAccessibleDescription("Filter docs");
	});

	test("forwards className, data-slot, and ref on the legend and the hints", async () => {
		const legendRef = createRef<HTMLParagraphElement>();
		const hintsRef = createRef<HTMLParagraphElement>();
		render(
			<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
				<Query.Input aria-label="Filter" placeholder="Filter" />
				<Query.Content>
					<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
					<Query.Footer>
						<Query.Legend ref={legendRef} className="legend" data-slot="mine" />
						<Query.KeyboardHints ref={hintsRef} className="hints" data-slot="mine" />
					</Query.Footer>
				</Query.Content>
			</Query.Root>,
		);

		screen.getByRole("combobox").focus();
		const legend = (await screen.findByText("excludes")).closest("p");
		const hints = screen.getByText("pick a suggestion").closest("p");

		expect(legendRef.current).toBe(legend);
		expect(hintsRef.current).toBe(hints);
		expect(legend).toHaveClass("legend");
		expect(legend).toHaveAttribute("data-slot", "mine query-legend");
		expect(hints).toHaveClass("hints");
		expect(hints).toHaveAttribute("data-slot", "mine query-keyboard-hints");
	});
});

describe("Query.Content", () => {
	test("forwards className, ref, data-slot, and popover props to the popover", async () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
				<Query.Input aria-label="Filter projects" placeholder="Filter" />
				<Query.Content ref={ref} className="custom" data-slot="mine" id="suggestions">
					<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
				</Query.Content>
			</Query.Root>,
		);

		screen.getByRole("combobox").focus();
		const listbox = await screen.findByRole("listbox");
		const popover = listbox.closest('[data-slot~="query-content"]');

		expect(popover).toBe(ref.current);
		expect(popover).toHaveClass("custom");
		expect(popover).toHaveAttribute("id", "suggestions");
		expect(popover?.getAttribute("data-slot")?.split(" ")).toContain("mine");
	});

	test("shows the keyboard hints under the legend, with the host's Enter action", async () => {
		const { input } = renderQuery();

		input.focus();
		await screen.findByRole("listbox");
		expect(screen.getByText("pick a suggestion")).toBeInTheDocument();
		expect(screen.getByText("select")).toBeInTheDocument();
		expect(input).toHaveAccessibleDescription(/Enter select/);
	});

	test("names the host's own Enter action with enterHint", async () => {
		render(
			<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
				<Query.Input aria-label="Search" placeholder="Search" />
				<QueryContent enterHint="select, or search" />
			</Query.Root>,
		);

		screen.getByRole("combobox").focus();
		expect(await screen.findByText("select, or search")).toBeInTheDocument();
	});

	test("exposes the listbox as the popup, with no dialog around it", async () => {
		const { input } = renderQuery();

		input.focus();
		await screen.findByRole("listbox");

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	test("offers a qualifier's values with live match counts once the colon is typed", async () => {
		const { input } = renderQuery();

		input.focus();
		type(input, "is:");

		const listbox = await screen.findByRole("listbox");
		expect(
			within(listbox)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual([
			"newCreated this week1",
			"sharedShared with your team2",
			"privateOnly you can see it1",
			"archivedKept for reference0",
		]);
		expect(within(listbox).getByRole("group", { name: "Values" })).toBeInTheDocument();
	});

	test("shows no match counts when the caller has no items to count", async () => {
		const { input } = renderQuery({ items: null });

		input.focus();
		type(input, "is:");

		const listbox = await screen.findByRole("listbox");
		expect(
			within(listbox)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual([
			"newCreated this week",
			"sharedShared with your team",
			"privateOnly you can see it",
			"archivedKept for reference",
		]);
	});

	test("writes the canonical value into the input when an option is clicked", async () => {
		const { input, values } = renderQuery();

		input.focus();
		type(input, "is:sha");

		fireEvent.click(await screen.findByRole("option", { name: /shared/ }));

		// Canonicalized, and a trailing space so the next token starts clean.
		expect(input).toHaveValue("is:shared ");
		expect(values.at(-1)).toBe("is:shared ");
	});

	test("moves the active option with the arrow keys and accepts it with Enter", async () => {
		const { input } = renderQuery();

		input.focus();
		type(input, "is:");
		const options = within(await screen.findByRole("listbox")).getAllByRole("option");

		// Nothing is active until the keyboard makes it so.
		expect(input).not.toHaveAttribute("aria-activedescendant");

		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(input).toHaveAttribute("aria-activedescendant", options[0]?.id);
		expect(options[0]).toHaveAttribute("aria-selected", "true");

		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(input).toHaveAttribute("aria-activedescendant", options[1]?.id);

		fireEvent.keyDown(input, { key: "Enter" });
		expect(input).toHaveValue("is:shared ");
	});

	test("wraps the active option around the ends of the list", async () => {
		const { input } = renderQuery();

		input.focus();
		type(input, "is:");
		const options = within(await screen.findByRole("listbox")).getAllByRole("option");

		// Nothing is active: ArrowUp starts from the last option.
		fireEvent.keyDown(input, { key: "ArrowUp" });
		expect(input).toHaveAttribute("aria-activedescendant", options.at(-1)?.id);
		// From the last option, ArrowDown wraps to the first.
		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(input).toHaveAttribute("aria-activedescendant", options[0]?.id);
		// From the first option, ArrowUp wraps to the last.
		fireEvent.keyDown(input, { key: "ArrowUp" });
		expect(input).toHaveAttribute("aria-activedescendant", options.at(-1)?.id);
		// Away from the ends, ArrowUp moves back one option.
		fireEvent.keyDown(input, { key: "ArrowUp" });
		expect(input).toHaveAttribute("aria-activedescendant", options.at(-2)?.id);
	});

	test("dismisses a passive list on Enter without touching the query", async () => {
		const { input } = renderQuery();

		input.focus();
		// A finished filter with a trailing space: the key list is open again,
		// and Enter must not write the first key into the query.
		type(input, "is:archived ");
		await screen.findByRole("listbox");

		fireEvent.keyDown(input, { key: "Enter" });

		await waitFor(() => {
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		});
		expect(input).toHaveValue("is:archived ");
	});

	test("lets Enter reach a hosting form unless it accepts a suggestion", async () => {
		const { input } = renderQuery();

		input.focus();
		type(input, "is:");
		await screen.findByRole("listbox");

		// An active suggestion claims Enter: the form must stay put.
		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);
		expect(input).toHaveValue("is:new ");

		// With no active suggestion, Enter passes through to the form.
		expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(true);
	});

	test("accepts no hidden row on Enter when the popover has no list", async () => {
		const values: string[] = [];
		render(
			<Query.Root grammar={testGrammar} value="" onValueChange={(value) => values.push(value)}>
				<Query.Input aria-label="Filter" placeholder="Filter" />
				<Query.Content>
					<Query.Footer>Filter docs</Query.Footer>
				</Query.Content>
			</Query.Root>,
		);
		const input = screen.getByRole("combobox");

		input.focus();
		await screen.findByText("Filter docs");
		fireEvent.keyDown(input, { key: "ArrowDown" });

		expect(input).not.toHaveAttribute("aria-activedescendant");
		expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(true);
		expect(values).toEqual([]);
	});

	test("adds no highlight when a row's mouse handlers prevent the default", async () => {
		render(
			<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
				<Query.Input aria-label="Filter" placeholder="Filter" />
				<Query.Content>
					<Query.List>
						{(suggestion) => (
							<Query.Item
								suggestion={suggestion}
								onMouseMove={(event) => event.preventDefault()}
								onMouseLeave={(event) => event.preventDefault()}
							/>
						)}
					</Query.List>
				</Query.Content>
			</Query.Root>,
		);

		screen.getByRole("combobox").focus();
		const [firstOption] = within(await screen.findByRole("listbox")).getAllByRole("option");
		if (firstOption == null) {
			throw new Error("expected the key list to have options");
		}
		fireEvent.mouseMove(firstOption);

		expect(firstOption).not.toHaveAttribute("data-highlighted");
	});

	// A pointer at rest over the open list must not make a row active, or Enter
	// inserts that row instead of submitting the typed query.
	test("lets Enter reach a hosting form while the pointer rests on a row", async () => {
		const { input } = renderQuery();

		input.focus();
		type(input, "is:archived ");
		const [firstOption] = within(await screen.findByRole("listbox")).getAllByRole("option");
		if (firstOption == null) {
			throw new Error("expected the key list to have options");
		}
		fireEvent.mouseMove(firstOption);

		expect(firstOption).toHaveAttribute("data-highlighted");
		expect(input).not.toHaveAttribute("aria-activedescendant");
		expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(true);
		expect(input).toHaveValue("is:archived ");
	});

	test("leaves the keys to the IME while it is composing", async () => {
		const { input } = renderQuery();

		input.focus();
		type(input, "is:");
		await screen.findByRole("listbox");

		fireEvent.keyDown(input, { key: "ArrowDown", isComposing: true });
		expect(input).not.toHaveAttribute("aria-activedescendant");

		fireEvent.keyDown(input, { key: "Enter", isComposing: true });
		expect(input).toHaveValue("is:");
		expect(screen.getByRole("listbox")).toBeInTheDocument();
	});

	test("retires the active option when the caret moves", async () => {
		const { input } = renderQuery();

		input.focus();
		type(input, "is:");
		const options = within(await screen.findByRole("listbox")).getAllByRole("option");

		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(input).toHaveAttribute("aria-activedescendant", options[0]?.id);

		// A caret move rebuilds the suggestions, so the old index would point into
		// a list the user was never shown; Enter must dismiss, not accept.
		input.setSelectionRange(1, 1);
		fireEvent.select(input);

		expect(input).not.toHaveAttribute("aria-activedescendant");
		fireEvent.keyDown(input, { key: "Enter" });
		expect(input).toHaveValue("is:");
	});

	test("closes the suggestions on Escape without changing the query", async () => {
		const { input } = renderQuery();

		input.focus();
		type(input, "is:");
		await screen.findByRole("listbox");

		fireEvent.keyDown(input, { key: "Escape" });

		await waitFor(() => {
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		});
		expect(input).toHaveValue("is:");
		expect(input).toHaveAttribute("aria-expanded", "false");
	});

	test("reopens with no active option after a dismissal", async () => {
		const { input } = renderQuery();

		input.focus();
		type(input, "is:");
		await screen.findByRole("listbox");
		fireEvent.keyDown(input, { key: "ArrowDown" });
		fireEvent.keyDown(input, { key: "Escape" });
		await waitFor(() => {
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		});

		fireEvent.click(input);
		await screen.findByRole("listbox");

		expect(input).not.toHaveAttribute("aria-activedescendant");
		fireEvent.keyDown(input, { key: "Enter" });
		expect(input).toHaveValue("is:");
	});

	test("extends a comma list without inserting a space into it", async () => {
		const { input } = renderQuery();

		input.focus();
		type(input, "is:new,sha");

		fireEvent.click(await screen.findByRole("option", { name: /shared/ }));

		expect(input).toHaveValue("is:new,shared ");
	});

	test("adds no space when the caret already sits against one", async () => {
		const { input } = renderQuery();

		input.focus();
		typeWithCaret(input, "is:sha acme", 6);

		fireEvent.click(await screen.findByRole("option", { name: /shared/ }));

		expect(input).toHaveValue("is:shared acme");
	});

	test("adds no space when the caret sits against a comma mid-list", async () => {
		const { input } = renderQuery();

		input.focus();
		typeWithCaret(input, "is:new,sha,archived", 10);

		fireEvent.click(await screen.findByRole("option", { name: /shared/ }));

		expect(input).toHaveValue("is:new,shared,archived");
	});

	test("renders the footer under the empty state when no suggestion matches", async () => {
		const { input } = renderQuery({
			initialValue: "zzzz",
			footer: <p>Press Enter to apply</p>,
		});

		input.focus();

		const footer = await screen.findByText("Press Enter to apply");
		expect(footer.parentElement).toHaveAttribute("data-slot", "query-footer");
		expect(screen.queryAllByRole("option")).toHaveLength(0);
	});

	test("stays open when focus moves into the footer, so a pressed link keeps its click", async () => {
		const { input } = renderQuery({ footer: <a href="#filter-docs">Filter docs</a> });

		input.focus();
		const link = await screen.findByRole("link", { name: "Filter docs" });
		fireEvent.blur(input, { relatedTarget: link });

		expect(screen.getByRole("listbox")).toBeInTheDocument();
	});

	test("closes the open list when the field turns read-only", async () => {
		function Host({ readOnly }: { readOnly: boolean }) {
			return (
				<Query.Root grammar={testGrammar} value="" onValueChange={() => {}}>
					<Query.Input aria-label="Filter projects" placeholder="Filter" readOnly={readOnly} />
					<QueryContent />
				</Query.Root>
			);
		}
		const { rerender } = render(<Host readOnly={false} />);

		screen.getByRole("combobox").focus();
		await screen.findByRole("listbox");
		rerender(<Host readOnly />);

		await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
	});

	test("says that a conjunction search reads only qualifiers when no suggestion matches", async () => {
		const grammar = defineRemoteFilterGrammar({
			syntax: "conjunction",
			keys: [{ key: "is", description: "State", values: [{ value: "active" }] }],
		});
		render(
			<Query.Root grammar={grammar} value="zzzz" onValueChange={() => {}}>
				<Query.Input aria-label="Search" placeholder="Search" />
				<QueryContent />
			</Query.Root>,
		);

		screen.getByRole("combobox").focus();

		expect(
			await screen.findByText("No filter matches. This search reads only key:value filters."),
		).toBeInTheDocument();
	});

	test("survives footer text that swaps to an element after a translation", async () => {
		function Host() {
			const [value, setValue] = useState("");
			return (
				<Query.Root grammar={testGrammar} value={value} onValueChange={setValue}>
					<Query.Input aria-label="Filter projects" placeholder="Filter" />
					<Query.Content>
						<Query.List>{(suggestion) => <Query.Item suggestion={suggestion} />}</Query.List>
						<Query.Footer>
							{value === "" ? "Type a filter" : <strong>Filtering</strong>}
						</Query.Footer>
					</Query.Content>
				</Query.Root>
			);
		}
		render(<Host />);
		const input = screen.getByRole("combobox");

		input.focus();
		const footer = (await screen.findByText("Type a filter")).closest('[data-slot="query-footer"]');
		if (footer == null) {
			throw new Error("expected the footer wrapper");
		}
		translateTextNodes(footer);
		type(input, "a");

		expect(footer).toHaveTextContent("Filtering");
	});

	test("opens on an arrow key when no suggestion matches", async () => {
		const { input } = renderQuery({
			initialValue: "zzzz",
			fieldProps: { suggestOnFocus: false },
			footer: <p>Press Enter to apply</p>,
		});

		input.focus();
		expect(screen.queryByText("Press Enter to apply")).not.toBeInTheDocument();

		fireEvent.keyDown(input, { key: "ArrowDown" });

		expect(await screen.findByText("Press Enter to apply")).toBeInTheDocument();
	});

	test("keeps the popover open with an empty state when no suggestion matches", async () => {
		const { input } = renderQuery();

		input.focus();
		await screen.findByRole("listbox");
		type(input, "zzzz");

		expect(
			await screen.findByText("No filter matches. The words search as text."),
		).toBeInTheDocument();
		expect(screen.queryAllByRole("option")).toHaveLength(0);
		expect(input).toHaveAttribute("aria-expanded", "true");
		expect(input).toHaveAccessibleDescription(/No filter matches/);
	});

	test("describes a free-text qualifier while its value is typed", async () => {
		const { input } = renderQuery();

		input.focus();
		type(input, "name:api");

		expect(
			await screen.findByText("Text in the project name. Any text matches."),
		).toBeInTheDocument();
		expect(screen.getByText(/excludes/)).toBeInTheDocument();
	});

	test("points back to the values when a listed value does not match", async () => {
		const { input } = renderQuery();

		input.focus();
		type(input, "is:zzzz");

		expect(await screen.findByText("No value matches. Delete the value after")).toBeInTheDocument();
		expect(screen.queryAllByRole("option")).toHaveLength(0);
	});

	test("describes the filter syntax to assistive tech while the list is open", async () => {
		const { input } = renderQuery();

		expect(input).not.toHaveAccessibleDescription(/excludes/);
		input.focus();
		await screen.findByRole("listbox");

		expect(input).toHaveAccessibleDescription(/-key:value excludes/);
		expect(input).toHaveAccessibleDescription(/OR joins filters/);
	});

	test("describes only key:value for a qualifiers-only grammar", async () => {
		const input = renderRemoteQuery(
			defineRemoteFilterGrammar({ keys: [{ key: "is", description: "State" }] }),
		);

		input.focus();
		await screen.findByRole("listbox");

		expect(input).toHaveAccessibleDescription(/key:value narrows the search/);
		expect(input).not.toHaveAccessibleDescription(/excludes/);
	});

	test("leaves exclusions out of the legend when no key can exclude", async () => {
		const input = renderRemoteQuery(
			defineRemoteFilterGrammar({
				syntax: "conjunction",
				keys: [{ key: "host", description: "Host", negatable: false }],
			}),
		);

		input.focus();
		await screen.findByRole("listbox");

		expect(input).toHaveAccessibleDescription(/key:a,b matches either/);
		expect(input).not.toHaveAccessibleDescription(/excludes/);
	});

	test("leaves OR out of the legend for a conjunction grammar", async () => {
		const input = renderRemoteQuery(
			defineRemoteFilterGrammar({
				syntax: "conjunction",
				keys: [{ key: "is", description: "State" }],
			}),
		);

		input.focus();
		await screen.findByRole("listbox");

		expect(input).toHaveAccessibleDescription(/-key:value excludes/);
		expect(input).not.toHaveAccessibleDescription(/OR joins/);
	});
});
