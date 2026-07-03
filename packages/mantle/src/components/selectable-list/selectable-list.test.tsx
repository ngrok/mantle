import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import {
	filterSelectableOptions,
	isInteractiveRowTarget,
	SelectableList,
	summarizeSelection,
	toggleSelectionValue,
} from "./selectable-list.js";

const options = [
	{ value: "a", label: "Apple" },
	{ value: "b", label: "Banana" },
	{ value: "c", label: "Cherry", disabled: true },
];

describe("filterSelectableOptions", () => {
	test("returns all options for an empty or whitespace query", () => {
		expect(filterSelectableOptions(options, "")).toEqual(options);
		expect(filterSelectableOptions(options, "   ")).toEqual(options);
	});

	test("returns the same array reference for an empty query (does no work)", () => {
		// The empty-query fast path returns the input untouched rather than copying it.
		expect(filterSelectableOptions(options, "")).toBe(options);
		expect(filterSelectableOptions(options, "   ")).toBe(options);
	});

	test("matches label case-insensitively as a substring", () => {
		expect(filterSelectableOptions(options, "AN").map((option) => option.value)).toEqual(["b"]);
	});

	test("returns an empty array when nothing matches", () => {
		expect(filterSelectableOptions(options, "zzz")).toEqual([]);
	});
});

describe("toggleSelectionValue", () => {
	test("adds a value when absent", () => {
		expect(toggleSelectionValue(["a"], "b")).toEqual(["a", "b"]);
	});

	test("removes a value when present", () => {
		expect(toggleSelectionValue(["a", "b"], "a")).toEqual(["b"]);
	});

	test("does not mutate the input array", () => {
		const input = ["a"];
		toggleSelectionValue(input, "b");
		expect(input).toEqual(["a"]);
	});
});

describe("summarizeSelection", () => {
	test("reports none selected", () => {
		expect(summarizeSelection(options, new Set())).toEqual({
			allSelected: false,
			someSelected: false,
		});
	});

	test("reports some selected", () => {
		expect(summarizeSelection(options, new Set(["a"]))).toEqual({
			allSelected: false,
			someSelected: true,
		});
	});

	test("ignores disabled options when deciding all-selected", () => {
		// `a` and `b` are the only selectable options; `c` is disabled.
		expect(summarizeSelection(options, new Set(["a", "b"]))).toEqual({
			allSelected: true,
			someSelected: true,
		});
	});

	test("reports nothing for an empty option set", () => {
		expect(summarizeSelection([], new Set())).toEqual({
			allSelected: false,
			someSelected: false,
		});
	});
});

describe("isInteractiveRowTarget", () => {
	test("returns true for a control or label inside the row (the row must not double-toggle)", () => {
		const row = document.createElement("div");
		const button = document.createElement("button");
		row.append(button);
		expect(isInteractiveRowTarget(button, row)).toBe(true);

		const label = document.createElement("label");
		row.append(label);
		expect(isInteractiveRowTarget(label, row)).toBe(true);
	});

	test("returns false for non-interactive row content (the row toggles)", () => {
		const row = document.createElement("div");
		const description = document.createElement("p");
		row.append(description);
		expect(isInteractiveRowTarget(description, row)).toBe(false);
	});

	test("returns false for a non-element target", () => {
		const row = document.createElement("div");
		expect(isInteractiveRowTarget(null, row)).toBe(false);
	});

	test("ignores interactive ancestors outside the row", () => {
		// The row is nested inside a button; a click on the row's own text must not
		// be treated as interactive just because an ancestor is.
		const outerButton = document.createElement("button");
		const row = document.createElement("div");
		const text = document.createElement("p");
		outerButton.append(row);
		row.append(text);
		expect(isInteractiveRowTarget(text, row)).toBe(false);
	});
});

describe("SelectableList.SelectAll", () => {
	test("is unchecked with no selection and selects every enabled option on toggle", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(values: string[]) => void>();
		render(
			<SelectableList.Root options={options} value={[]} onValueChange={onValueChange}>
				<SelectableList.SelectAll>Select all</SelectableList.SelectAll>
			</SelectableList.Root>,
		);

		const checkbox = screen.getByRole("checkbox", { name: "Select all" });
		expect(checkbox).not.toBeChecked();

		await user.click(checkbox);
		// `c` is disabled, so it is excluded.
		expect(onValueChange).toHaveBeenCalledWith(["a", "b"]);
	});

	test("is indeterminate when only some options are selected", () => {
		render(
			<SelectableList.Root options={options} value={["a"]}>
				<SelectableList.SelectAll>Select all</SelectableList.SelectAll>
			</SelectableList.Root>,
		);

		expect(screen.getByRole("checkbox", { name: "Select all" })).toHaveAttribute(
			"aria-checked",
			"mixed",
		);
	});

	test("clears only the filtered selection when toggled off", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(values: string[]) => void>();
		render(
			<SelectableList.Root options={options} value={["a", "b"]} onValueChange={onValueChange}>
				<SelectableList.SelectAll>Select all</SelectableList.SelectAll>
			</SelectableList.Root>,
		);

		// All enabled options are selected, so the header is checked.
		expect(screen.getByRole("checkbox", { name: "Select all" })).toBeChecked();

		await user.click(screen.getByRole("checkbox", { name: "Select all" }));
		expect(onValueChange).toHaveBeenCalledWith([]);
	});
});

describe("SelectableList.SelectAll with an active filter", () => {
	// Stateful so union/clear behavior across successive toggles is observable.
	function FilterSelectAllHarness({
		onValueChange,
	}: {
		onValueChange: (values: string[]) => void;
	}) {
		const [selected, setSelected] = useState<string[]>(["a"]);
		const filterableOptions = [
			{ value: "a", label: "Apple" },
			{ value: "b", label: "Banana" },
			{ value: "d", label: "Currant" },
			{ value: "c", label: "Cranberry", disabled: true },
		];
		return (
			<SelectableList.Root
				options={filterableOptions}
				value={selected}
				onValueChange={(next) => {
					onValueChange(next);
					setSelected(next);
				}}
			>
				<SelectableList.Filter aria-label="Filter fruit" />
				<SelectableList.SelectAll>Select all</SelectableList.SelectAll>
				<SelectableList.Viewport aria-label="Fruit" />
			</SelectableList.Root>
		);
	}

	test("selects only the filtered enabled options, preserving selection outside the filter", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(values: string[]) => void>();
		render(<FilterSelectAllHarness onValueChange={onValueChange} />);

		// "ran" matches Currant and Cranberry (disabled); Apple ("a") stays selected
		// but is filtered out of view.
		await user.type(screen.getByRole("textbox", { name: "Filter fruit" }), "ran");
		expect(screen.getAllByRole("row")).toHaveLength(2);

		await user.click(screen.getByRole("checkbox", { name: "Select all" }));
		// Union: the out-of-filter Apple selection is preserved; disabled Cranberry excluded.
		expect(onValueChange).toHaveBeenLastCalledWith(["a", "d"]);
	});

	test("clearing removes only the filtered values, keeping the rest of the selection", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(values: string[]) => void>();
		render(<FilterSelectAllHarness onValueChange={onValueChange} />);

		await user.type(screen.getByRole("textbox", { name: "Filter fruit" }), "ran");
		const selectAll = screen.getByRole("checkbox", { name: "Select all" });
		await user.click(selectAll); // ["a", "d"] — all filtered selectable selected
		expect(selectAll).toBeChecked();

		await user.click(selectAll);
		// Only the filtered value (Currant) is cleared; Apple survives.
		expect(onValueChange).toHaveBeenLastCalledWith(["a"]);
	});

	test("is disabled when the filter leaves no selectable options", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(values: string[]) => void>();
		render(<FilterSelectAllHarness onValueChange={onValueChange} />);

		// "Cranb" matches only the disabled option.
		await user.type(screen.getByRole("textbox", { name: "Filter fruit" }), "Cranb");
		expect(screen.getByRole("checkbox", { name: "Select all" })).toBeDisabled();
	});
});

describe("SelectableList selection state", () => {
	test("uncontrolled selection seeds from defaultValue, toggles internally, and reports changes", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(values: string[]) => void>();
		render(
			<SelectableList.Root options={options} defaultValue={["a"]} onValueChange={onValueChange}>
				<SelectableList.Viewport aria-label="Fruit" />
			</SelectableList.Root>,
		);

		expect(screen.getByRole("checkbox", { name: "Apple" })).toBeChecked();

		await user.click(screen.getByRole("checkbox", { name: "Banana" }));
		expect(onValueChange).toHaveBeenCalledWith(["a", "b"]);
		expect(screen.getByRole("checkbox", { name: "Banana" })).toBeChecked();
	});

	test("a controlled value wins over internal toggles", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(values: string[]) => void>();
		render(
			<SelectableList.Root options={options} value={[]} onValueChange={onValueChange}>
				<SelectableList.Viewport aria-label="Fruit" />
			</SelectableList.Root>,
		);

		await user.click(screen.getByRole("checkbox", { name: "Apple" }));
		// The change is reported, but the un-updated controlled value keeps it unchecked.
		expect(onValueChange).toHaveBeenCalledWith(["a"]);
		expect(screen.getByRole("checkbox", { name: "Apple" })).not.toBeChecked();
	});

	test("a disabled option cannot be toggled by a bare row click", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(values: string[]) => void>();
		render(
			<SelectableList.Root options={options} value={[]} onValueChange={onValueChange}>
				<SelectableList.Viewport aria-label="Fruit" />
			</SelectableList.Root>,
		);

		// Cherry is disabled via options[].disabled — the single source of truth.
		const cherryRow = screen.getByRole("checkbox", { name: "Cherry" }).closest("[role='row']");
		if (cherryRow == null) {
			throw new Error("Cherry row not found");
		}
		expect(cherryRow).toHaveAttribute("aria-disabled", "true");
		await user.click(cherryRow);
		expect(onValueChange).not.toHaveBeenCalled();
	});
});

describe("SelectableList filter query", () => {
	test("a controlled query filters the rows, and typing reports without mutating it", async () => {
		const user = userEvent.setup();
		const onQueryChange = vi.fn<(query: string) => void>();
		render(
			<SelectableList.Root options={options} query="an" onQueryChange={onQueryChange}>
				<SelectableList.Filter aria-label="Filter fruit" />
				<SelectableList.Viewport aria-label="Fruit" />
			</SelectableList.Root>,
		);

		// "an" matches only Banana.
		expect(screen.getAllByRole("row")).toHaveLength(1);
		expect(screen.getByRole("checkbox", { name: "Banana" })).toBeInTheDocument();

		const input = screen.getByRole<HTMLInputElement>("textbox", { name: "Filter fruit" });
		await user.type(input, "x");
		expect(onQueryChange).toHaveBeenCalledWith("anx");
		// Controlled: the value did not change, so neither did the input or the rows.
		expect(input.value).toBe("an");
		expect(screen.getAllByRole("row")).toHaveLength(1);
	});

	test("defaultQuery seeds the uncontrolled filter", () => {
		render(
			<SelectableList.Root options={options} defaultQuery="an">
				<SelectableList.Filter aria-label="Filter fruit" />
				<SelectableList.Viewport aria-label="Fruit" />
			</SelectableList.Root>,
		);

		expect(screen.getByRole<HTMLInputElement>("textbox", { name: "Filter fruit" }).value).toBe(
			"an",
		);
		expect(screen.getAllByRole("row")).toHaveLength(1);
	});

	test("a custom filter predicate replaces the label substring match", async () => {
		const user = userEvent.setup();
		render(
			<SelectableList.Root
				options={options}
				filter={(option, query) => query === "" || option.value === query}
			>
				<SelectableList.Filter aria-label="Filter fruit" />
				<SelectableList.Viewport aria-label="Fruit" />
			</SelectableList.Root>,
		);

		expect(screen.getAllByRole("row")).toHaveLength(options.length);

		// "a" discriminates the predicates: the value match keeps only Apple, while
		// the default label substring match would also keep Banana ("banana"
		// contains "a") — so two rows here would mean the custom filter was ignored.
		await user.type(screen.getByRole("textbox", { name: "Filter fruit" }), "a");
		expect(screen.getAllByRole("row")).toHaveLength(1);
		expect(screen.getByRole("checkbox", { name: "Apple" })).toBeInTheDocument();
	});
});

describe("SelectableList.Empty", () => {
	test("renders only when the filter matches nothing", async () => {
		const user = userEvent.setup();
		render(
			<SelectableList.Root options={options} defaultValue={[]}>
				<SelectableList.Filter aria-label="Filter fruit" />
				<SelectableList.Empty>No results found.</SelectableList.Empty>
			</SelectableList.Root>,
		);

		expect(screen.queryByText("No results found.")).not.toBeInTheDocument();

		await user.type(screen.getByRole("textbox", { name: "Filter fruit" }), "zzz");
		expect(screen.getByText("No results found.")).toBeInTheDocument();
	});

	test("is an always-mounted polite status region, so the empty state is announced", async () => {
		const user = userEvent.setup();
		render(
			<SelectableList.Root options={options} defaultValue={[]}>
				<SelectableList.Filter aria-label="Filter fruit" />
				<SelectableList.Empty>No results found.</SelectableList.Empty>
			</SelectableList.Root>,
		);

		// The live region must exist in the tree *before* its content changes,
		// otherwise screen readers won't reliably announce the message.
		const status = screen.getByRole("status");
		expect(status).toBeEmptyDOMElement();

		await user.type(screen.getByRole("textbox", { name: "Filter fruit" }), "zzz");
		expect(status).toHaveTextContent("No results found.");

		// Clearing the filter empties the region again without unmounting it.
		await user.clear(screen.getByRole("textbox", { name: "Filter fruit" }));
		expect(screen.getByRole("status")).toBeEmptyDOMElement();
	});
});

describe("SelectableList parts outside Root", () => {
	test("throw a helpful error", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			expect(() => render(<SelectableList.Filter />)).toThrow(
				/must be rendered inside SelectableList.Root/,
			);
		} finally {
			errorSpy.mockRestore();
		}
	});
});
