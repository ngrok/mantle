import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
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
