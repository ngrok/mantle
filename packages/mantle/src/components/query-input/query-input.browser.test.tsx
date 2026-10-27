import { render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { testGrammar } from "../../utils/query-filter/test-grammar.js";
import { QueryInput } from "./query-input.js";

/** The compound under a `useState`, with the state painted where a test can read it. */
function Host({ onValueChange }: { onValueChange?: (value: string) => void }) {
	const [value, setValue] = useState("");
	return (
		<>
			<QueryInput.Root
				grammar={testGrammar}
				value={value}
				onValueChange={(next) => {
					setValue(next);
					onValueChange?.(next);
				}}
			>
				<QueryInput.Field
					aria-label="Filter domains"
					placeholder="Filter domains, or type a filter like domain:api"
				/>
				<QueryInput.BuilderMenu label="Add filter" />
				<QueryInput.Content />
			</QueryInput.Root>
			<output aria-label="query state">{value}</output>
		</>
	);
}

describe("QueryInput in a browser", () => {
	// A suggestion lands through `setRangeText`, which Chromium does not route
	// through React's value tracker. Without a resync, deleting back to the
	// tracked value is dropped, and the state keeps the suggestion over an empty input.
	test("hands every edit to the caller after a suggestion is accepted", async () => {
		render(<Host />);
		const input = page.getByRole("combobox", { name: "Filter domains" });

		await userEvent.click(input);
		await userEvent.click(page.getByRole("option", { name: /^domain:/ }));
		await expect.element(input).toHaveValue("domain:");

		await userEvent.clear(input);

		await expect.element(input).toHaveValue("");
		await expect.element(page.getByLabelText("query state")).toHaveTextContent("");
	});

	test("reports an accepted suggestion once", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(<Host onValueChange={onValueChange} />);
		const input = page.getByRole("combobox", { name: "Filter domains" });

		await userEvent.click(input);
		await userEvent.click(page.getByRole("option", { name: /^domain:/ }));
		await expect.element(input).toHaveValue("domain:");

		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("domain:");
	});

	// FEP-1917: a pointer pick in the builder menu must leave focus in the field,
	// so the next keystroke types the value.
	test("keeps typing in the field after a pointer pick in the builder menu", async () => {
		render(<Host />);
		const input = page.getByRole("combobox", { name: "Filter domains" });

		await userEvent.click(page.getByRole("button", { name: "Add filter" }));
		await userEvent.click(page.getByRole("menuitem", { name: /^domain:/ }));
		await expect.element(input).toHaveFocus();

		await userEvent.keyboard("api");

		await expect.element(input).toHaveValue("domain:api");
	});
});
