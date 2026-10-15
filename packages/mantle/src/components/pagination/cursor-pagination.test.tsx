import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { CursorPagination } from "./cursor-pagination.js";

describe("CursorPagination", () => {
	// Regression: `Select.Value` had no children, so Radix filled the trigger on
	// the client after a layout effect and the server HTML had an empty trigger.
	test("PageSizeSelect renders the page size in the server HTML", () => {
		const html = renderToString(
			<CursorPagination.Root pageSize={50}>
				<CursorPagination.PageSizeSelect />
			</CursorPagination.Root>,
		);
		const container = document.createElement("div");
		container.innerHTML = html;
		expect(container.querySelector('[role="combobox"]')).toHaveTextContent("50 per page");
	});

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
		const { rerender } = render(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.Buttons hasNextPage hasPreviousPage={false} />
			</CursorPagination.Root>,
		);
		expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();

		// The last page flips both: each button follows its own flag.
		rerender(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.Buttons hasNextPage={false} hasPreviousPage />
			</CursorPagination.Root>,
		);
		expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
		expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
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
		expect(onPreviousPage).not.toHaveBeenCalled();
		await user.click(screen.getByRole("button", { name: "Previous page" }));
		expect(onPreviousPage).toHaveBeenCalledTimes(1);
		expect(onNextPage).toHaveBeenCalledTimes(1);
	});

	test("PageSizeSelect renders exactly the provided pageSizes as options", async () => {
		const user = userEvent.setup();
		render(
			<CursorPagination.Root defaultPageSize={10}>
				<CursorPagination.PageSizeSelect pageSizes={[10, 25]} />
			</CursorPagination.Root>,
		);

		await user.click(screen.getByRole("combobox", { name: "Items per page" }));

		const listbox = await screen.findByRole("listbox");
		expect(
			within(listbox)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual(["10 per page", "25 per page"]);
	});

	test("PageSizeSelect throws when the page size is not one of the pageSizes", () => {
		// silence React's own error logging for the intentional render throw
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<CursorPagination.Root defaultPageSize={11}>
					<CursorPagination.PageSizeSelect pageSizes={[10, 25]} />
				</CursorPagination.Root>,
			),
		).toThrow(/pageSize must be included in CursorPageSizeSelect\.pageSizes/);
	});

	test("PageSizeSelect and PageSizeValue throw when rendered outside Root", () => {
		// silence React's own error logging for the intentional render throws
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<CursorPagination.PageSizeSelect />)).toThrow(
			/must be used as a child of a CursorPagination component/,
		);
		expect(() => render(<CursorPagination.PageSizeValue />)).toThrow(
			/must be used as a child of a CursorPagination component/,
		);
	});

	test("uncontrolled: picking a size updates the select, the value, and both callbacks", async () => {
		const user = userEvent.setup();
		const onRootChange = vi.fn<(pageSize: number) => void>();
		const onSelectChange = vi.fn<(pageSize: number) => void>();
		render(
			<CursorPagination.Root defaultPageSize={10} onChangePageSize={onRootChange}>
				<CursorPagination.PageSizeSelect onChangePageSize={onSelectChange} />
				<CursorPagination.PageSizeValue data-testid="value" />
			</CursorPagination.Root>,
		);

		await user.click(screen.getByRole("combobox", { name: "Items per page" }));
		await user.click(await screen.findByRole("option", { name: "20 per page" }));

		expect(onRootChange).toHaveBeenCalledTimes(1);
		expect(onRootChange).toHaveBeenLastCalledWith(20);
		expect(onSelectChange).toHaveBeenCalledTimes(1);
		expect(onSelectChange).toHaveBeenLastCalledWith(20);
		expect(screen.getByRole("combobox", { name: "Items per page" })).toHaveTextContent(
			"20 per page",
		);
		expect(screen.getByTestId("value")).toHaveTextContent("20 per page");
	});

	describe("controlled page size", () => {
		// Regression: `PageSizeSelect` rendered an uncontrolled `Select` seeded once
		// at mount, so a page size that changed outside the component (a browser
		// history move that rewrote a URL param) never reached the select.
		test("an external change updates the select and the value", () => {
			const { rerender } = render(
				<CursorPagination.Root pageSize={10}>
					<CursorPagination.PageSizeSelect />
					<CursorPagination.PageSizeValue data-testid="value" />
				</CursorPagination.Root>,
			);
			expect(screen.getByRole("combobox", { name: "Items per page" })).toHaveTextContent(
				"10 per page",
			);

			rerender(
				<CursorPagination.Root pageSize={50}>
					<CursorPagination.PageSizeSelect />
					<CursorPagination.PageSizeValue data-testid="value" />
				</CursorPagination.Root>,
			);
			expect(screen.getByRole("combobox", { name: "Items per page" })).toHaveTextContent(
				"50 per page",
			);
			expect(screen.getByTestId("value")).toHaveTextContent("50 per page");
		});

		test("picking a size reports it and keeps the prop until the owner changes it", async () => {
			const user = userEvent.setup();
			const onChangePageSize = vi.fn<(pageSize: number) => void>();
			render(
				<CursorPagination.Root pageSize={10} onChangePageSize={onChangePageSize}>
					<CursorPagination.PageSizeSelect />
				</CursorPagination.Root>,
			);

			await user.click(screen.getByRole("combobox", { name: "Items per page" }));
			await user.click(await screen.findByRole("option", { name: "20 per page" }));

			expect(onChangePageSize).toHaveBeenCalledTimes(1);
			expect(onChangePageSize).toHaveBeenLastCalledWith(20);
			expect(screen.getByRole("combobox", { name: "Items per page" })).toHaveTextContent(
				"10 per page",
			);
		});
	});

	test("Root throws when neither defaultPageSize nor pageSize is passed", () => {
		// silence React's own error logging for the intentional render throw
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => {
			render(
				// @ts-expect-error the props union requires one of the two
				<CursorPagination.Root>
					<CursorPagination.PageSizeValue />
				</CursorPagination.Root>,
			);
		}).toThrow(/requires either `defaultPageSize` or `pageSize`/);
	});
});
