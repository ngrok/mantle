import { render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { testGrammar } from "../../utils/query-filter/test-grammar.js";
import { Query } from "./query.js";

/** The compound under a `useState`, with the state painted where a test can read it. */
function Host({ onValueChange }: { onValueChange?: (value: string) => void }) {
	const [value, setValue] = useState("");
	return (
		<>
			<Query.Root
				grammar={testGrammar}
				value={value}
				onValueChange={(next) => {
					setValue(next);
					onValueChange?.(next);
				}}
			>
				<Query.Input
					aria-label="Filter projects"
					placeholder="Filter projects, or type a filter like name:api"
				/>
				<Query.Content />
			</Query.Root>
			<output aria-label="query state">{value}</output>
		</>
	);
}

describe("Query in a browser", () => {
	// A suggestion lands through `setRangeText`, which Chromium does not route
	// through React's value tracker. Without a resync, deleting back to the
	// tracked value is dropped, and the state keeps the suggestion over an empty input.
	test("hands every edit to the caller after a suggestion is accepted", async () => {
		render(<Host />);
		const input = page.getByRole("combobox", { name: "Filter projects" });

		await userEvent.click(input);
		await userEvent.click(page.getByRole("option", { name: /^name:/ }));
		await expect.element(input).toHaveValue("name:");

		await userEvent.clear(input);

		await expect.element(input).toHaveValue("");
		await expect.element(page.getByLabelText("query state")).toHaveTextContent("");
	});

	test("reports an accepted suggestion once", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(<Host onValueChange={onValueChange} />);
		const input = page.getByRole("combobox", { name: "Filter projects" });

		await userEvent.click(input);
		await userEvent.click(page.getByRole("option", { name: /^name:/ }));
		await expect.element(input).toHaveValue("name:");

		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("name:");
	});

	test("submits the host form on Enter unless Enter accepts an active row", async () => {
		const onSubmit = vi.fn<() => void>();
		render(
			<form
				onSubmit={(event) => {
					event.preventDefault();
					onSubmit();
				}}
			>
				<Host />
			</form>,
		);
		const input = page.getByRole("combobox", { name: "Filter projects" });

		await userEvent.click(input);
		await userEvent.keyboard("{ArrowDown}{Enter}");
		await expect.element(input).toHaveValue("name:");
		expect(onSubmit).not.toHaveBeenCalled();

		await userEvent.keyboard("acme{Enter}");
		expect(onSubmit).toHaveBeenCalledOnce();
	});

	// Radix reports a mouse press outside the popover after the click, when the
	// clear button is already gone. The popover must not read that as a dismiss.
	test("keeps the suggestions open after the clear button empties the query", async () => {
		render(<Host />);
		const input = page.getByRole("combobox", { name: "Filter projects" });

		await userEvent.click(input);
		await userEvent.keyboard("acme");
		await userEvent.click(page.getByRole("button", { name: "Clear filter" }));

		await expect.element(input).toHaveValue("");
		await expect.element(input).toHaveFocus();
		await expect.element(input).toHaveAttribute("aria-expanded", "true");
	});
});
