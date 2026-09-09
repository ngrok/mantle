import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
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

	// Regression: `goToLastPage` set `currentPage` to `totalPages`, which is 0 for
	// an empty list, so the 1-indexed page went to 0 and the offset went negative.
	test("goToLastPage on an empty list stays on page 1", () => {
		const { result } = renderHook(() =>
			useOffsetPagination({
				listSize: 0,
				pageSize: 10,
			}),
		);
		act(() => {
			result.current.goToLastPage();
		});
		expect(result.current.currentPage).toBe(1);
		expect(result.current.offset).toBe(0);
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

	describe("defaultPage", () => {
		test("starts on the given page", () => {
			const { result } = renderHook(() =>
				useOffsetPagination({ listSize: 50, pageSize: 10, defaultPage: 3 }),
			);
			expect(result.current.currentPage).toBe(3);
			expect(result.current.offset).toBe(20);
			expect(result.current.hasPreviousPage).toBe(true);
			expect(result.current.hasNextPage).toBe(true);
		});

		test("a page past the end clamps to the last page", () => {
			const { result } = renderHook(() =>
				useOffsetPagination({ listSize: 25, pageSize: 10, defaultPage: 9 }),
			);
			expect(result.current.currentPage).toBe(3);
			expect(result.current.offset).toBe(20);
			expect(result.current.hasNextPage).toBe(false);
		});
	});

	describe("controlled page", () => {
		test("mount does not call onPageChange", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const { result } = renderHook(() =>
				useOffsetPagination({ listSize: 50, pageSize: 10, page: 4, onPageChange }),
			);
			expect(result.current.currentPage).toBe(4);
			expect(onPageChange).not.toHaveBeenCalled();
		});

		test("navigation reports the next page and waits for the prop", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 50, pageSize: 10, page: 2, onPageChange },
			});

			act(() => result.current.nextPage());
			expect(onPageChange).toHaveBeenCalledTimes(1);
			expect(onPageChange).toHaveBeenLastCalledWith(3);
			expect(result.current.currentPage).toBe(2);

			rerender({ listSize: 50, pageSize: 10, page: 3, onPageChange });
			expect(result.current.currentPage).toBe(3);
			expect(result.current.offset).toBe(20);
		});

		test("a move to the current page does not call onPageChange", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const { result } = renderHook(() =>
				useOffsetPagination({ listSize: 50, pageSize: 10, page: 2, onPageChange }),
			);
			act(() => result.current.goToPage(2));
			expect(onPageChange).not.toHaveBeenCalled();
		});

		test("a stale page past the end clamps, and goToLastPage repairs it", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const { result } = renderHook(() =>
				useOffsetPagination({ listSize: 25, pageSize: 10, page: 5, onPageChange }),
			);
			expect(result.current.currentPage).toBe(3);
			expect(result.current.hasNextPage).toBe(false);
			expect(onPageChange).not.toHaveBeenCalled();

			act(() => result.current.goToLastPage());
			expect(onPageChange).toHaveBeenCalledTimes(1);
			expect(onPageChange).toHaveBeenLastCalledWith(3);
		});

		test("a pageSize change reports page 1", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const { rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 500, pageSize: 10, page: 4, onPageChange },
			});
			rerender({ listSize: 500, pageSize: 50, page: 4, onPageChange });
			expect(onPageChange).toHaveBeenCalledTimes(1);
			expect(onPageChange).toHaveBeenLastCalledWith(1);
		});

		test("a listSize change reports page 1 by default", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const { rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 500, pageSize: 10, page: 4, onPageChange },
			});
			rerender({ listSize: 400, pageSize: 10, page: 4, onPageChange });
			expect(onPageChange).toHaveBeenCalledTimes(1);
			expect(onPageChange).toHaveBeenLastCalledWith(1);
		});
	});

	describe("resetPageOnListSizeChange: false", () => {
		// Regression: a background refetch that changed the list length sent the
		// user back to page 1.
		test("a list that grows keeps the page", () => {
			const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 500, pageSize: 10, resetPageOnListSizeChange: false },
			});
			act(() => result.current.goToPage(5));
			expect(result.current.currentPage).toBe(5);

			rerender({ listSize: 600, pageSize: 10, resetPageOnListSizeChange: false });
			expect(result.current.currentPage).toBe(5);
			expect(result.current.totalPages).toBe(60);
		});

		test("a list that shrinks clamps the page to the new last page", () => {
			const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 500, pageSize: 10, resetPageOnListSizeChange: false },
			});
			act(() => result.current.goToPage(50));
			expect(result.current.currentPage).toBe(50);

			rerender({ listSize: 25, pageSize: 10, resetPageOnListSizeChange: false });
			expect(result.current.currentPage).toBe(3);
			expect(result.current.offset).toBe(20);
			expect(result.current.hasNextPage).toBe(false);
			expect(result.current.hasPreviousPage).toBe(true);
		});

		test("a listSize change does not call onPageChange", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: {
					listSize: 500,
					pageSize: 10,
					page: 4,
					onPageChange,
					resetPageOnListSizeChange: false,
				},
			});
			rerender({
				listSize: 400,
				pageSize: 10,
				page: 4,
				onPageChange,
				resetPageOnListSizeChange: false,
			});
			expect(onPageChange).not.toHaveBeenCalled();
			expect(result.current.currentPage).toBe(4);
		});
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
