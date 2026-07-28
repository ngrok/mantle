import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { CursorPagination } from "./cursor-pagination.js";

describe("CursorPagination.Buttons", () => {
	test("disables only the previous button on the first page", () => {
		render(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.Buttons hasPreviousPage={false} hasNextPage />
			</CursorPagination.Root>,
		);

		expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
	});

	test("disables only the next button on the last page", () => {
		render(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.Buttons hasPreviousPage hasNextPage={false} />
			</CursorPagination.Root>,
		);

		expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
		expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
	});

	test("clicking next invokes only `onNextPage`", async () => {
		const user = userEvent.setup();
		const onNextPage = vi.fn<() => void>();
		const onPreviousPage = vi.fn<() => void>();
		render(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.Buttons
					hasPreviousPage
					hasNextPage
					onNextPage={onNextPage}
					onPreviousPage={onPreviousPage}
				/>
			</CursorPagination.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Next page" }));

		expect(onNextPage).toHaveBeenCalledTimes(1);
		expect(onPreviousPage).not.toHaveBeenCalled();
	});

	test("clicking previous invokes only `onPreviousPage`", async () => {
		const user = userEvent.setup();
		const onNextPage = vi.fn<() => void>();
		const onPreviousPage = vi.fn<() => void>();
		render(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.Buttons
					hasPreviousPage
					hasNextPage
					onNextPage={onNextPage}
					onPreviousPage={onPreviousPage}
				/>
			</CursorPagination.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Previous page" }));

		expect(onPreviousPage).toHaveBeenCalledTimes(1);
		expect(onNextPage).not.toHaveBeenCalled();
	});

	test("a disabled button never invokes its callback", async () => {
		const user = userEvent.setup();
		const onNextPage = vi.fn<() => void>();
		const onPreviousPage = vi.fn<() => void>();
		render(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.Buttons
					hasPreviousPage={false}
					hasNextPage={false}
					onNextPage={onNextPage}
					onPreviousPage={onPreviousPage}
				/>
			</CursorPagination.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Next page" }));
		await user.click(screen.getByRole("button", { name: "Previous page" }));

		expect(onNextPage).not.toHaveBeenCalled();
		expect(onPreviousPage).not.toHaveBeenCalled();
	});
});

describe("CursorPagination.PageSizeSelect", () => {
	test("seeds the trigger from `defaultPageSize`", () => {
		render(
			<CursorPagination.Root defaultPageSize={20}>
				<CursorPagination.PageSizeSelect />
			</CursorPagination.Root>,
		);

		expect(screen.getByRole("combobox")).toHaveTextContent("20 per page");
	});

	test("choosing a size reports it as a number and updates the rendered page size", async () => {
		const user = userEvent.setup();
		const onChangePageSize = vi.fn<(value: number) => void>();
		render(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.PageSizeSelect onChangePageSize={onChangePageSize} />
				<CursorPagination.PageSizeValue data-testid="page-size-value" />
			</CursorPagination.Root>,
		);

		await user.click(screen.getByRole("combobox"));
		await user.click(await screen.findByRole("option", { name: "50 per page" }));

		expect(onChangePageSize).toHaveBeenCalledTimes(1);
		expect(onChangePageSize).toHaveBeenLastCalledWith(50);
		// The reported value is a number, not the raw `"50"` option value.
		expect(onChangePageSize.mock.calls[0]?.[0]).toBeTypeOf("number");
		// Root owns the page size, so the sibling read-only value follows along.
		expect(screen.getByTestId("page-size-value")).toHaveTextContent("50 per page");
		expect(screen.getByRole("combobox")).toHaveTextContent("50 per page");
	});

	test("renders exactly the provided `pageSizes` as options", async () => {
		const user = userEvent.setup();
		render(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.PageSizeSelect pageSizes={[10, 25]} />
			</CursorPagination.Root>,
		);

		await user.click(screen.getByRole("combobox"));

		const listbox = await screen.findByRole("listbox");
		expect(
			within(listbox)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual(["10 per page", "25 per page"]);
	});

	test("throws when `defaultPageSize` is not one of the `pageSizes`", () => {
		expect(() =>
			render(
				<CursorPagination.Root defaultPageSize={11}>
					<CursorPagination.PageSizeSelect pageSizes={[10, 25]} />
				</CursorPagination.Root>,
			),
		).toThrow(/defaultPageSize must be included/);
	});

	test("throws when rendered outside `CursorPagination.Root`", () => {
		expect(() => render(<CursorPagination.PageSizeSelect />)).toThrow(
			/must be used as a child of a CursorPagination component/,
		);
	});
});

describe("CursorPagination.PageSizeValue", () => {
	test("renders the current page size as read-only text", () => {
		render(
			<CursorPagination.Root defaultPageSize={20}>
				<CursorPagination.PageSizeValue />
			</CursorPagination.Root>,
		);

		expect(screen.getByText("20 per page")).toBeInTheDocument();
		// Read-only: no control is rendered for it.
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
	});

	test("throws when rendered outside `CursorPagination.Root`", () => {
		expect(() => render(<CursorPagination.PageSizeValue />)).toThrow(
			/must be used as a child of a CursorPagination component/,
		);
	});
});
