import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { getOffsetPaginatedSlice, useOffsetPagination } from "./use-offset-pagination.js";

describe("useOffsetPagination", () => {
	test("given a list size of zero", () => {
		const { result } = renderHook(() =>
			useOffsetPagination({
				listSize: 0,
				pageSize: 10,
			}),
		);
		expect(result.current.currentPage).toBe(1);
		expect(result.current.totalPages).toBe(0);
		expect(result.current.hasNextPage).toBe(false);
		expect(result.current.hasPreviousPage).toBe(false);
	});

	test("given a list size of 1", () => {
		const { result } = renderHook(() =>
			useOffsetPagination({
				listSize: 1,
				pageSize: 10,
			}),
		);
		expect(result.current.currentPage).toBe(1);
		expect(result.current.totalPages).toBe(1);
		expect(result.current.hasNextPage).toBe(false);
		expect(result.current.hasPreviousPage).toBe(false);
	});

	test("given a list size of 1867 and a page size of 100", () => {
		const { result } = renderHook(() =>
			useOffsetPagination({
				listSize: 1867,
				pageSize: 100,
			}),
		);
		expect(result.current.currentPage).toBe(1);
		expect(result.current.totalPages).toBe(19);
		expect(result.current.hasNextPage).toBe(true);
		expect(result.current.hasPreviousPage).toBe(false);

		act(() => {
			result.current.nextPage();
		});
		expect(result.current.currentPage).toBe(2);
		expect(result.current.hasNextPage).toBe(true);
		expect(result.current.hasPreviousPage).toBe(true);

		act(() => {
			result.current.goToPage(10);
		});
		expect(result.current.currentPage).toBe(10);
		expect(result.current.hasNextPage).toBe(true);
		expect(result.current.hasPreviousPage).toBe(true);

		act(() => {
			result.current.goToLastPage();
		});
		expect(result.current.currentPage).toBe(19);
		expect(result.current.hasNextPage).toBe(false);
		expect(result.current.hasPreviousPage).toBe(true);

		act(() => {
			result.current.previousPage();
		});
		expect(result.current.currentPage).toBe(18);
		expect(result.current.hasNextPage).toBe(true);
		expect(result.current.hasPreviousPage).toBe(true);

		act(() => {
			result.current.setPageSize(50);
		});
		expect(result.current.currentPage).toBe(1);
		expect(result.current.totalPages).toBe(38);
		expect(result.current.hasNextPage).toBe(true);
		expect(result.current.hasPreviousPage).toBe(false);
	});

	test.each([
		{ label: "0", page: 0, expectedPage: 1, expectedOffset: 0 },
		{ label: "-5", page: -5, expectedPage: 1, expectedOffset: 0 },
		{ label: "1", page: 1, expectedPage: 1, expectedOffset: 0 },
		{ label: "19 (the last page)", page: 19, expectedPage: 19, expectedOffset: 1800 },
		{ label: "20", page: 20, expectedPage: 19, expectedOffset: 1800 },
		{ label: "9999", page: 9999, expectedPage: 19, expectedOffset: 1800 },
	])(
		"goToPage($label) clamps to page $expectedPage with offset $expectedOffset",
		({ page, expectedPage, expectedOffset }) => {
			const { result } = renderHook(() =>
				useOffsetPagination({
					listSize: 1867,
					pageSize: 100,
				}),
			);

			act(() => {
				result.current.goToPage(page);
			});

			expect(result.current.currentPage).toBe(expectedPage);
			expect(result.current.offset).toBe(expectedOffset);
		},
	);

	test("goToFirstPage returns to page 1 from anywhere in the list", () => {
		const { result } = renderHook(() =>
			useOffsetPagination({
				listSize: 1867,
				pageSize: 100,
			}),
		);

		act(() => {
			result.current.goToPage(7);
		});
		expect(result.current.currentPage).toBe(7);
		expect(result.current.offset).toBe(600);

		act(() => {
			result.current.goToFirstPage();
		});
		expect(result.current.currentPage).toBe(1);
		expect(result.current.offset).toBe(0);
		expect(result.current.hasPreviousPage).toBe(false);
	});

	test("navigating an empty list keeps the pagination on page 1 with a zero offset", () => {
		const { result } = renderHook(() =>
			useOffsetPagination({
				listSize: 0,
				pageSize: 10,
			}),
		);

		act(() => {
			result.current.nextPage();
		});
		expect(result.current.currentPage).toBe(1);
		expect(result.current.offset).toBe(0);

		act(() => {
			result.current.previousPage();
		});
		expect(result.current.currentPage).toBe(1);
		expect(result.current.offset).toBe(0);

		// `totalPages` is 0 here, so the clamp has to floor at 1 rather than follow it down.
		act(() => {
			result.current.goToPage(3);
		});
		expect(result.current.currentPage).toBe(1);
		expect(result.current.offset).toBe(0);

		act(() => {
			result.current.goToFirstPage();
		});
		expect(result.current.currentPage).toBe(1);
		expect(result.current.offset).toBe(0);
	});

	test("changing the page size resets the current page to 1", async () => {
		const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
			initialProps: {
				listSize: 1867,
				pageSize: 100,
			},
		});

		expect(result.current.currentPage).toBe(1);
		expect(result.current.pageSize).toBe(100);

		act(() => result.current.nextPage());
		expect(result.current.currentPage).toBe(2);

		rerender({ listSize: 1867, pageSize: 50 });
		expect(result.current.currentPage).toBe(1);
	});

	test("changing the list size resets the current page to 1", async () => {
		const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
			initialProps: {
				listSize: 1867,
				pageSize: 100,
			},
		});

		expect(result.current.currentPage).toBe(1);
		expect(result.current.pageSize).toBe(100);

		act(() => result.current.nextPage());
		expect(result.current.currentPage).toBe(2);

		rerender({ listSize: 200, pageSize: 100 });
		expect(result.current.currentPage).toBe(1);
	});
});

describe("getOffsetPaginatedSlice", () => {
	test("given a list size of zero and a page size of 10", () => {
		const list: number[] = [];
		const pageSize = 10;
		const { result } = renderHook(() =>
			useOffsetPagination({
				listSize: list.length,
				pageSize,
			}),
		);

		const slice = getOffsetPaginatedSlice(list, result.current);
		expect(slice).toEqual([]);
	});

	test("given a list size of 1 and a page size of 10", () => {
		const list = [1];
		const pageSize = 10;
		const { result } = renderHook(() =>
			useOffsetPagination({
				listSize: list.length,
				pageSize,
			}),
		);

		const slice = getOffsetPaginatedSlice(list, result.current);
		expect(slice).toEqual([1]);
	});

	test("given a list of size 11 and a page size of 10", () => {
		const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
		const pageSize = 10;
		const { result } = renderHook(() =>
			useOffsetPagination({
				listSize: list.length,
				pageSize,
			}),
		);

		const slice = getOffsetPaginatedSlice(list, result.current);
		expect(slice).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

		act(() => result.current.nextPage());
		const nextSlice = getOffsetPaginatedSlice(list, result.current);
		expect(nextSlice).toEqual([11]);

		// there should be no more pages, the slice should be the same as the previous one
		act(() => result.current.nextPage());
		const lastSlice = getOffsetPaginatedSlice(list, result.current);
		expect(lastSlice).toEqual([11]);
	});
});
