import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { CursorPagination } from "./cursor-pagination.js";

describe("CursorPagination", () => {
	// Regression: the page-size combobox had no name beyond its value, so a
	// screen reader user heard "100 per page" with no hint of what it set.
	test("PageSizeSelect names its combobox 'Items per page' by default", () => {
		render(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.PageSizeSelect />
			</CursorPagination.Root>,
		);
		const trigger = screen.getByRole("combobox", { name: "Items per page" });
		expect(trigger).toHaveTextContent("10 per page");
		expect(trigger).not.toHaveAttribute("value");
	});

	test("PageSizeSelect lets a consumer override the accessible name", () => {
		render(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.PageSizeSelect aria-label="Rows per page" />
			</CursorPagination.Root>,
		);
		expect(screen.getByRole("combobox", { name: "Rows per page" })).toBeInTheDocument();
	});

	test("Buttons name the previous and next controls and mirror the page availability", () => {
		render(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.Buttons hasNextPage hasPreviousPage={false} />
			</CursorPagination.Root>,
		);
		expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
	});

	test("Buttons call the page callbacks on click", async () => {
		const user = userEvent.setup();
		const onNextPage = vi.fn<() => void>();
		const onPreviousPage = vi.fn<() => void>();
		render(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.Buttons
					hasNextPage
					hasPreviousPage
					onNextPage={onNextPage}
					onPreviousPage={onPreviousPage}
				/>
			</CursorPagination.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Next page" }));
		expect(onNextPage).toHaveBeenCalledTimes(1);
		await user.click(screen.getByRole("button", { name: "Previous page" }));
		expect(onPreviousPage).toHaveBeenCalledTimes(1);
	});
});
