import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { type ReactNode, createRef, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { defineRemoteFilterGrammar } from "../../utils/query-filter/grammar.js";
import { type TestItem, testGrammar, testItems } from "../../utils/query-filter/test-grammar.js";
import { Field } from "../field/field.js";
import { QueryInput, type QueryInputFieldProps } from "./query-input.js";

/** Field props a test can set. The harness owns the label and the placeholder. */
type ExtraFieldProps = Partial<Omit<QueryInputFieldProps, "placeholder">> &
	Record<`data-${string}`, string>;

/** Props for {@link ControlledQueryInput}. */
type ControlledQueryInputProps = {
	/** The query the input starts with. */
	initialValue: string;
	/** The items the input counts against; `null` hands the input none. */
	items: TestItem[] | null;
	/** Called with every query the input hands back. */
	onValueChange: (value: string) => void;
	/** Props for `QueryInput.Field`. */
	fieldProps?: ExtraFieldProps;
	/** Children of `QueryInput.Field`: the inline actions. */
	fieldChildren?: ReactNode;
	/** Children of `QueryInput.Content`: the footer under the legend. */
	footer?: ReactNode;
};

/** The compound under a `useState`, the way a table hosts it, reporting every value it writes. */
function ControlledQueryInput({
	initialValue,
	items,
	onValueChange,
	fieldProps,
	fieldChildren,
	footer,
}: ControlledQueryInputProps) {
	const [value, setValue] = useState(initialValue);

	return (
		<QueryInput.Root
			grammar={testGrammar}
			items={items ?? undefined}
			value={value}
			onValueChange={(nextValue) => {
				setValue(nextValue);
				onValueChange(nextValue);
			}}
		>
			<QueryInput.Field
				aria-label="Filter domains"
				placeholder="Filter domains, or type a filter like domain:api"
				{...fieldProps}
			>
				{fieldChildren}
			</QueryInput.Field>
			<QueryInput.BuilderMenu label="Add filter" />
			<QueryInput.Content>{footer}</QueryInput.Content>
		</QueryInput.Root>
	);
}

/** Renders the controlled compound, reporting every value it writes. */
function renderQueryInput({
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
			<ControlledQueryInput
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
	const input = screen.getByRole<HTMLInputElement>("combobox", { name: "Filter domains" });

	return { values, input };
}

/** Renders the compound over a grammar that another system executes. */
function renderRemoteQueryInput(grammar: ReturnType<typeof defineRemoteFilterGrammar>) {
	render(
		<QueryInput.Root grammar={grammar} value="" onValueChange={() => {}}>
			<QueryInput.Field aria-label="Search" placeholder="Search" />
			<QueryInput.Content />
		</QueryInput.Root>,
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

describe("QueryInput.Root", () => {
	test("forwards className, data attributes, and ref to its row", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<QueryInput.Root
				ref={ref}
				grammar={testGrammar}
				value=""
				onValueChange={() => {}}
				className="custom-row"
				data-testid="row"
			>
				<QueryInput.Field aria-label="Filter domains" placeholder="Filter" />
			</QueryInput.Root>,
		);

		const row = screen.getByTestId("row");
		expect(row).toHaveAttribute("data-slot", "query-input");
		expect(row).toHaveClass("custom-row");
		expect(ref.current).toBe(row);
	});

	test("merges its props, slot, and ref onto the child with asChild", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<QueryInput.Root
				asChild
				ref={ref}
				grammar={testGrammar}
				value=""
				onValueChange={() => {}}
				className="custom-row"
				data-state-hook="row"
			>
				<section aria-label="Filters" className="own-class">
					<QueryInput.Field aria-label="Filter domains" placeholder="Filter" />
				</section>
			</QueryInput.Root>,
		);

		const row = screen.getByRole("region", { name: "Filters" });
		expect(row).toHaveAttribute("data-slot", "query-input");
		expect(row).toHaveAttribute("data-state-hook", "row");
		expect(row).toHaveClass("custom-row", "own-class");
		expect(ref.current).toBe(row);
	});

	test("throws when a part renders outside it", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<QueryInput.Field aria-label="Filter" placeholder="Filter" />)).toThrow(
			"QueryInput.Field must be rendered inside QueryInput.Root.",
		);
	});
});

describe("QueryInput.Field", () => {
	test("sends className and data attributes to its outer element, and ref to the input", () => {
		const ref = createRef<HTMLInputElement>();
		renderQueryInput({ fieldProps: { ref, className: "custom-field", "data-testid": "field" } });

		const field = screen.getByTestId("field");
		expect(field).toHaveAttribute("data-slot", "query-input-field");
		expect(field).toHaveClass("custom-field");
		expect(ref.current).toBe(screen.getByRole("combobox", { name: "Filter domains" }));
	});

	test("offers every qualifier when the empty input takes focus", async () => {
		const { input } = renderQueryInput();

		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		input.focus();

		const listbox = await screen.findByRole("listbox", { name: "Filter suggestions" });
		expect(
			within(listbox)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual(expect.arrayContaining(["domain:Text in the domain name"]));
		expect(input).toHaveAttribute("aria-expanded", "true");
		expect(input).toHaveAttribute("aria-controls", listbox.id);
	});

	test("waits for a click before it offers suggestions when focus alone must not open them", async () => {
		const { input } = renderQueryInput({ fieldProps: { suggestOnFocus: false } });

		input.focus();
		expect(input).toHaveFocus();
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

		fireEvent.click(input);
		expect(await screen.findByRole("listbox", { name: "Filter suggestions" })).toBeInTheDocument();
	});

	test("stays collapsed without a QueryInput.Content to show the list", () => {
		render(
			<QueryInput.Root grammar={testGrammar} value="" onValueChange={() => {}}>
				<QueryInput.Field aria-label="Filter domains" placeholder="Filter" />
			</QueryInput.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Filter domains" });

		act(() => input.focus());

		expect(input).toHaveAttribute("aria-expanded", "false");
	});

	test("hands every typed query to the caller", () => {
		const { input, values } = renderQueryInput();

		type(input, "is:custom acme");

		expect(values).toEqual(["is:custom acme"]);
	});

	test("paints the caller's query as colored runs beside the input", () => {
		const { input } = renderQueryInput({ initialValue: "is:bogus" });

		expect(input).toHaveValue("is:bogus");
		// The painted copy holds one element per highlighted run, so the key and
		// its unknown value are separate elements.
		expect(screen.getByText("is")).toBeInTheDocument();
		expect(screen.getByText("bogus")).toBeInTheDocument();
		// A translated copy would drift out of line with the caret.
		expect(screen.getByText("bogus").closest("[aria-hidden]")).toHaveAttribute("translate", "no");
	});

	test("scrolls the painted copy with the input, so a long query stays aligned", () => {
		const { input } = renderQueryInput({ initialValue: 'description:"a long value"' });

		// happy-dom has no layout, so the test asserts the mechanism: the overlay
		// takes the scroll offset of the input.
		input.scrollLeft = 40;
		fireEvent.scroll(input);

		expect(screen.getByText("description").closest('[aria-hidden="true"]')?.scrollLeft).toBe(40);
	});

	test("renders its children as inline actions inside the input's box", () => {
		const { input } = renderQueryInput({
			fieldChildren: <button type="button">Clear filter</button>,
		});

		const action = screen.getByRole("button", { name: "Clear filter" });
		expect(input.closest('[data-slot~="input"]')).toContainElement(action);
		expect(action.parentElement).toHaveAttribute("data-slot", "query-input-field-actions");
	});

	test("survives a swapped inline action after a translation engine rewrote it", () => {
		function Host() {
			const [label, setLabel] = useState("Clear");
			return (
				<QueryInput.Root grammar={testGrammar} value="" onValueChange={() => {}}>
					<QueryInput.Field aria-label="Filter domains" placeholder="Filter">
						{label}
					</QueryInput.Field>
					<button type="button" onClick={() => setLabel("Reset")}>
						Swap
					</button>
				</QueryInput.Root>
			);
		}
		render(<Host />);

		const actions = screen.getByText("Clear").closest('[data-slot="query-input-field-actions"]');
		if (actions == null) {
			throw new Error("expected the inline actions wrapper");
		}
		translateTextNodes(actions);
		fireEvent.click(screen.getByRole("button", { name: "Swap" }));

		expect(actions).toHaveTextContent("Reset");
	});

	test("keeps a field owner's description and error wiring beside the legend", async () => {
		const { input } = renderQueryInput({
			initialValue: "is:bogus",
			before: <p id="hint">Enter applies the filter.</p>,
			fieldProps: { id: "domain-filter", "aria-describedby": "hint", "aria-invalid": true },
		});

		expect(input).toHaveAttribute("id", "domain-filter");
		expect(input).toBeInvalid();
		expect(input).toHaveAccessibleDescription("Enter applies the filter.");

		input.focus();
		await screen.findByRole("listbox");

		// The legend joins the owner's description instead of replacing it.
		expect(input).toHaveAccessibleDescription(/^Enter applies the filter\. -key:value excludes/);
	});

	test("takes its id, label, and description from Field.Control", () => {
		render(
			<Field.Item name="domainFilter">
				<Field.Label>Filter domains</Field.Label>
				<Field.Control>
					<QueryInput.Root grammar={testGrammar} value="" onValueChange={() => {}}>
						<QueryInput.Field placeholder="Filter" />
					</QueryInput.Root>
				</Field.Control>
				<Field.Description>Type a key and a colon.</Field.Description>
			</Field.Item>,
		);

		const input = screen.getByRole("combobox", { name: "Filter domains" });
		expect(input).toHaveAttribute("name", "domainFilter");
		expect(input).toHaveAccessibleDescription("Type a key and a colon.");
	});
});

describe("QueryInput.Content", () => {
	test("offers a qualifier's values with live match counts once the colon is typed", async () => {
		const { input } = renderQueryInput();

		input.focus();
		type(input, "is:");

		const listbox = await screen.findByRole("listbox");
		expect(
			within(listbox)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual([
			"devYour free dev domain1",
			"customA domain you brought to ngrok2",
			"managedA hostname ngrok gave you1",
			"wildcardCovers every subdomain0",
		]);
		expect(within(listbox).getByRole("group", { name: "Values" })).toBeInTheDocument();
	});

	test("shows no match counts when the caller has no items to count", async () => {
		const { input } = renderQueryInput({ items: null });

		input.focus();
		type(input, "is:");

		const listbox = await screen.findByRole("listbox");
		expect(
			within(listbox)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual([
			"devYour free dev domain",
			"customA domain you brought to ngrok",
			"managedA hostname ngrok gave you",
			"wildcardCovers every subdomain",
		]);
	});

	test("writes the canonical value into the input when an option is clicked", async () => {
		const { input, values } = renderQueryInput();

		input.focus();
		type(input, "is:cus");

		fireEvent.click(await screen.findByRole("option", { name: /custom/ }));

		// Canonicalized, and a trailing space so the next token starts clean.
		expect(input).toHaveValue("is:custom ");
		expect(values.at(-1)).toBe("is:custom ");
	});

	test("moves the active option with the arrow keys and accepts it with Enter", async () => {
		const { input } = renderQueryInput();

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
		expect(input).toHaveValue("is:custom ");
	});

	test("wraps the active option around the ends of the list", async () => {
		const { input } = renderQueryInput();

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
		const { input } = renderQueryInput();

		input.focus();
		// A finished filter with a trailing space: the key list is open again,
		// and Enter must not write the first key into the query.
		type(input, "is:wildcard ");
		await screen.findByRole("listbox");

		fireEvent.keyDown(input, { key: "Enter" });

		await waitFor(() => {
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		});
		expect(input).toHaveValue("is:wildcard ");
	});

	test("lets Enter reach a hosting form unless it accepts a suggestion", async () => {
		const { input } = renderQueryInput();

		input.focus();
		type(input, "is:");
		await screen.findByRole("listbox");

		// An active suggestion claims Enter: the form must stay put.
		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(false);
		expect(input).toHaveValue("is:dev ");

		// With no active suggestion, Enter passes through to the form.
		expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(true);
	});

	// A pointer at rest over the open list must not make a row active, or Enter
	// inserts that row instead of submitting the typed query.
	test("lets Enter reach a hosting form while the pointer rests on a row", async () => {
		const { input } = renderQueryInput();

		input.focus();
		type(input, "is:wildcard ");
		const [firstOption] = within(await screen.findByRole("listbox")).getAllByRole("option");
		if (firstOption == null) {
			throw new Error("expected the key list to have options");
		}
		fireEvent.mouseMove(firstOption);

		expect(firstOption).toHaveAttribute("data-highlighted");
		expect(input).not.toHaveAttribute("aria-activedescendant");
		expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(true);
		expect(input).toHaveValue("is:wildcard ");
	});

	test("leaves the keys to the IME while it is composing", async () => {
		const { input } = renderQueryInput();

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
		const { input } = renderQueryInput();

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
		const { input } = renderQueryInput();

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

	test("extends a comma list without inserting a space into it", async () => {
		const { input } = renderQueryInput();

		input.focus();
		type(input, "is:dev,cus");

		fireEvent.click(await screen.findByRole("option", { name: /custom/ }));

		expect(input).toHaveValue("is:dev,custom ");
	});

	test("adds no space when the caret already sits against one", async () => {
		const { input } = renderQueryInput();

		input.focus();
		typeWithCaret(input, "is:cus acme", 6);

		fireEvent.click(await screen.findByRole("option", { name: /custom/ }));

		expect(input).toHaveValue("is:custom acme");
	});

	test("adds no space when the caret sits against a comma mid-list", async () => {
		const { input } = renderQueryInput();

		input.focus();
		typeWithCaret(input, "is:dev,cus,wildcard", 10);

		fireEvent.click(await screen.findByRole("option", { name: /custom/ }));

		expect(input).toHaveValue("is:dev,custom,wildcard");
	});

	test("keeps the popover open on focus for its children, even when no suggestion matches", async () => {
		const { input } = renderQueryInput({
			initialValue: "zzzz",
			footer: <p>Press Enter to apply</p>,
		});

		input.focus();

		const footer = await screen.findByText("Press Enter to apply");
		expect(footer.parentElement).toHaveAttribute("data-slot", "query-input-content-footer");
		expect(screen.queryAllByRole("option")).toHaveLength(0);
	});

	test("closes when no suggestion matches and it has no children", async () => {
		const { input } = renderQueryInput();

		input.focus();
		await screen.findByRole("listbox");
		type(input, "zzzz");

		await waitFor(() => {
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		});
		expect(input).toHaveAttribute("aria-expanded", "false");
	});

	test("describes the filter syntax to assistive tech while the list is open", async () => {
		const { input } = renderQueryInput();

		expect(input).not.toHaveAccessibleDescription(/excludes/);
		input.focus();
		await screen.findByRole("listbox");

		expect(input).toHaveAccessibleDescription(/-key:value excludes/);
		expect(input).toHaveAccessibleDescription(/OR joins filters/);
	});

	test("describes only key:value for a qualifiers-only grammar", async () => {
		const input = renderRemoteQueryInput(
			defineRemoteFilterGrammar({ keys: [{ key: "is", description: "State" }] }),
		);

		input.focus();
		await screen.findByRole("listbox");

		expect(input).toHaveAccessibleDescription(/key:value narrows the search/);
		expect(input).not.toHaveAccessibleDescription(/excludes/);
	});

	test("leaves exclusions out of the legend when no key can exclude", async () => {
		const input = renderRemoteQueryInput(
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
		const input = renderRemoteQueryInput(
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

/** Opens the builder menu. Radix opens its dropdowns on pointerdown. */
function openBuilderMenu() {
	fireEvent.pointerDown(screen.getByRole("button", { name: "Add filter" }), {
		button: 0,
		ctrlKey: false,
	});
	return screen.getByRole("menu");
}

describe("QueryInput.BuilderMenu", () => {
	test("stamps its slot on the trigger", () => {
		renderQueryInput();

		expect(screen.getByRole("button", { name: "Add filter" })).toHaveAttribute(
			"data-slot",
			"query-input-builder-menu icon-button",
		);
	});

	test("starts an open-ended qualifier in the input and moves focus there", async () => {
		const { input, values } = renderQueryInput();

		const menu = openBuilderMenu();
		fireEvent.click(within(menu).getByRole("menuitem", { name: /domain:/ }));

		expect(input).toHaveValue("domain:");
		// Focus lands in the input, ready for the value, not back on the trigger.
		await waitFor(() => {
			expect(input).toHaveFocus();
		});
		expect(input.selectionStart).toBe("domain:".length);
		expect(values).toEqual(["domain:"]);
	});

	test("returns focus to the trigger on a plain dismissal", async () => {
		renderQueryInput();

		const menu = openBuilderMenu();
		fireEvent.keyDown(menu, { key: "Escape" });

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Add filter" })).toHaveFocus();
		});
	});

	test("writes a finished filter from a value submenu, with its match count shown", async () => {
		const { input } = renderQueryInput();

		const menu = openBuilderMenu();
		fireEvent.keyDown(within(menu).getByRole("menuitem", { name: /is:/ }), { key: "ArrowRight" });

		const valueItem = await screen.findByRole("menuitem", { name: /Your free dev domain/ });
		// One fixture domain is a dev domain.
		expect(valueItem).toHaveTextContent("1");

		fireEvent.click(valueItem);
		expect(input).toHaveValue("is:dev ");
	});

	test("counts submenu values against the query already typed", async () => {
		renderQueryInput({ initialValue: "is:custom" });

		const menu = openBuilderMenu();
		fireEvent.keyDown(within(menu).getByRole("menuitem", { name: /is:/ }), { key: "ArrowRight" });

		const valueItem = await screen.findByRole("menuitem", { name: /Your free dev domain/ });
		// "is:custom is:dev" ANDs, and no fixture domain is both. The bare count
		// would read 1, so the 0 proves the typed query is in play.
		expect(valueItem).toHaveTextContent("0");
	});

	test("shows no counts in a submenu when the caller has no items", async () => {
		renderQueryInput({ items: null });

		const menu = openBuilderMenu();
		fireEvent.keyDown(within(menu).getByRole("menuitem", { name: /is:/ }), { key: "ArrowRight" });

		const valueItem = await screen.findByRole("menuitem", { name: /Your free dev domain/ });
		expect(valueItem).toHaveTextContent(/^devYour free dev domain$/);
	});

	test("appends to what is already typed, spaced once", async () => {
		const { input } = renderQueryInput({ initialValue: "acme" });

		fireEvent.click(within(openBuilderMenu()).getByRole("menuitem", { name: /description:/ }));
		expect(input).toHaveValue("acme description:");
	});

	test("appends without doubling the space after a query that ends in one", async () => {
		const { input } = renderQueryInput({ initialValue: "acme " });

		fireEvent.click(within(openBuilderMenu()).getByRole("menuitem", { name: /description:/ }));
		expect(input).toHaveValue("acme description:");
	});

	test("computes no match counts until a value submenu opens", () => {
		const definition = testGrammar.keys.find((key) => key.key === "is");
		if (definition == null) {
			throw new Error("the test grammar lost its is key");
		}
		const matches = vi.spyOn(definition, "matches");

		// A fresh items array keeps the count cache cold, so a count another test
		// already paid for cannot mask an eager computation here.
		renderQueryInput({ items: testItems.map((item) => ({ ...item })) });
		openBuilderMenu();

		// Every count of an `is:` value at the root menu would call this matcher
		// once per item; the counts must wait for the submenu that shows them.
		expect(matches).toHaveBeenCalledTimes(0);
		matches.mockRestore();
	});
});
