import { act, renderHook } from "@testing-library/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { getOffsetPaginatedSlice } from "./offset-paginated-slice.js";
import { useOffsetPagination, type UseOffsetPaginationProps } from "./use-offset-pagination.js";

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
	test("goToLastPage on an empty list reports page 1", () => {
		const onPageChange = vi.fn<(page: number) => void>();
		const { result } = renderHook(() =>
			useOffsetPagination({ listSize: 0, pageSize: 10, page: 2, onPageChange }),
		);
		act(() => result.current.goToLastPage());
		expect(onPageChange).toHaveBeenCalledTimes(1);
		expect(onPageChange).toHaveBeenLastCalledWith(1);
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

	test("previousPage steps back one page", () => {
		const { result } = renderHook(() =>
			useOffsetPagination({ listSize: 1867, pageSize: 100, defaultPage: 19 }),
		);
		act(() => result.current.previousPage());
		expect(result.current.currentPage).toBe(18);
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
			const { result } = renderHook(() => useOffsetPagination({ listSize: 1867, pageSize: 100 }));
			act(() => result.current.goToPage(page));
			expect(result.current.currentPage).toBe(expectedPage);
			expect(result.current.offset).toBe(expectedOffset);
		},
	);

	test("goToFirstPage returns to page 1 from anywhere in the list", () => {
		const { result } = renderHook(() => useOffsetPagination({ listSize: 1867, pageSize: 100 }));
		act(() => result.current.goToPage(7));
		expect(result.current.currentPage).toBe(7);
		expect(result.current.offset).toBe(600);

		act(() => result.current.goToFirstPage());
		expect(result.current.currentPage).toBe(1);
		expect(result.current.offset).toBe(0);
		expect(result.current.hasPreviousPage).toBe(false);
	});

	test("navigating an empty list keeps page 1 with a zero offset", () => {
		const { result } = renderHook(() => useOffsetPagination({ listSize: 0, pageSize: 10 }));

		act(() => result.current.nextPage());
		expect(result.current.currentPage).toBe(1);
		expect(result.current.offset).toBe(0);

		act(() => result.current.previousPage());
		expect(result.current.currentPage).toBe(1);
		expect(result.current.offset).toBe(0);

		// `totalPages` is 0 here, so the clamp floors at 1 instead of following it down.
		act(() => result.current.goToPage(3));
		expect(result.current.currentPage).toBe(1);
		expect(result.current.offset).toBe(0);

		act(() => result.current.goToFirstPage());
		expect(result.current.currentPage).toBe(1);
		expect(result.current.offset).toBe(0);
	});

	test("setPageSize adopts the size and keeps the first item of the page in view", () => {
		const { result } = renderHook(() =>
			useOffsetPagination({ listSize: 1867, pageSize: 100, defaultPage: 18 }),
		);
		act(() => result.current.setPageSize(50));
		// Item 1700 starts page 18 at 100 a page, and page 35 at 50 a page.
		expect(result.current.currentPage).toBe(35);
		expect(result.current.offset).toBe(1700);
		expect(result.current.pageSize).toBe(50);
		expect(result.current.totalPages).toBe(38);
	});

	test.each([
		{ from: "page 3 at 20", page: 3, size: 20, next: 50, expectedPage: 1 },
		{ from: "page 4 at 20", page: 4, size: 20, next: 50, expectedPage: 2 },
		{ from: "page 6 at 20", page: 6, size: 20, next: 50, expectedPage: 3 },
		{ from: "page 2 at 50", page: 2, size: 50, next: 20, expectedPage: 3 },
	])(
		"setPageSize($next) from $from reports page $expectedPage and the size in one call",
		({ page, size, next, expectedPage }) => {
			const onPageChange = vi.fn<(page: number) => void>();
			const onPageSizeChange = vi.fn<(pageSize: number, page: number) => void>();
			const { result } = renderHook(() =>
				useOffsetPagination({
					listSize: 500,
					pageSize: size,
					page,
					onPageChange,
					onPageSizeChange,
				}),
			);
			act(() => result.current.setPageSize(next));
			expect(onPageSizeChange).toHaveBeenCalledTimes(1);
			expect(onPageSizeChange).toHaveBeenLastCalledWith(next, expectedPage);
			// Why: a second router write in the same tick would drop the size.
			expect(onPageChange).not.toHaveBeenCalled();
		},
	);

	test("setPageSize ignores a size that is not a positive whole number or is the current size", () => {
		const onPageSizeChange = vi.fn<(pageSize: number, page: number) => void>();
		const { result } = renderHook(() =>
			useOffsetPagination({ listSize: 500, pageSize: 20, page: 4, onPageSizeChange }),
		);
		act(() => result.current.setPageSize(0));
		act(() => result.current.setPageSize(Number.NaN));
		act(() => result.current.setPageSize(1.5));
		act(() => result.current.setPageSize(Number.POSITIVE_INFINITY));
		act(() => result.current.setPageSize(20));
		expect(onPageSizeChange).not.toHaveBeenCalled();
	});

	test("two resizes in one batch keep the reader's place", () => {
		const { result } = renderHook(() =>
			useOffsetPagination({ listSize: 500, pageSize: 20, defaultPage: 6 }),
		);
		act(() => {
			result.current.setPageSize(50);
			result.current.setPageSize(20);
		});
		expect(result.current.pageSize).toBe(20);
		expect(result.current.currentPage).toBe(6);
		expect(result.current.offset).toBe(100);
	});

	test("a controlled pageSize reads the size back from the prop", () => {
		const onPageSizeChange = vi.fn<(pageSize: number, page: number) => void>();
		const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
			initialProps: { listSize: 500, pageSize: 20, defaultPage: 6, onPageSizeChange },
		});
		act(() => result.current.setPageSize(50));
		// Until the parent commits the size, the page and its rows stay put.
		expect(result.current.pageSize).toBe(20);
		expect(result.current.currentPage).toBe(6);
		expect(result.current.offset).toBe(100);

		// A router can commit the echo a render late; the page must survive it.
		rerender({ listSize: 500, pageSize: 20, defaultPage: 6, onPageSizeChange });
		rerender({ listSize: 500, pageSize: 50, defaultPage: 6, onPageSizeChange });
		expect(result.current.pageSize).toBe(50);
		expect(result.current.currentPage).toBe(3);
		expect(result.current.offset).toBe(100);
	});

	test("a pageSize change adopts the size and resets to page 1", async () => {
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
		expect(result.current.pageSize).toBe(50);
		expect(result.current.totalPages).toBe(38);
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

	// Regression: `NaN !== NaN` kept the render-time size check true, and
	// React threw "Too many re-renders".
	test("a NaN pageSize renders", () => {
		const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
			initialProps: { listSize: 100, pageSize: 10 },
		});
		rerender({ listSize: 100, pageSize: Number.NaN });
		expect(result.current.pageSize).toBeNaN();
	});

	test("a second resize before the size echo keeps the reader's place", () => {
		const onPageSizeChange = vi.fn<(pageSize: number, page: number) => void>();
		const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
			initialProps: { listSize: 500, pageSize: 20, defaultPage: 6, onPageSizeChange },
		});
		act(() => result.current.setPageSize(50));
		rerender({ listSize: 500, pageSize: 50, defaultPage: 6, onPageSizeChange });
		act(() => result.current.setPageSize(100));
		// Until the echo, the accepted size 50 and its page 3 stay in view.
		expect(result.current.currentPage).toBe(3);
		expect(result.current.offset).toBe(100);
		rerender({ listSize: 500, pageSize: 100, defaultPage: 6, onPageSizeChange });
		expect(result.current.currentPage).toBe(2);
		expect(result.current.offset).toBe(100);
	});

	test("with a controlled page, the new size waits for the page echo", () => {
		const onPageChange = vi.fn<(page: number) => void>();
		const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
			initialProps: { listSize: 500, pageSize: 20, page: 6, onPageChange },
		});
		act(() => result.current.setPageSize(50));
		expect(onPageChange).toHaveBeenLastCalledWith(3);
		expect(result.current.pageSize).toBe(20);
		expect(result.current.offset).toBe(100);
		rerender({ listSize: 500, pageSize: 20, page: 3, onPageChange });
		expect(result.current.pageSize).toBe(50);
		expect(result.current.offset).toBe(100);
	});

	// Regression: the render that applied the new size still clamped the page
	// with the old size, and a parent that copies `currentPage` back during
	// render then stored that page.
	test("a parent that copies currentPage back keeps the page that setPageSize picked", () => {
		const { result } = renderHook(() => {
			const [page, setPage] = useState(2);
			const pagination = useOffsetPagination({
				listSize: 15,
				pageSize: 10,
				page,
				onPageChange: setPage,
			});
			if (page !== pagination.currentPage) {
				setPage(pagination.currentPage);
			}
			return pagination;
		});
		act(() => result.current.setPageSize(5));
		// Item 11 starts page 2 at 10 a page, and page 3 at 5 a page.
		expect(result.current.currentPage).toBe(3);
		expect(result.current.pageSize).toBe(5);
		expect(result.current.offset).toBe(10);
	});

	test("a list reset while a controlled size is pending moves the page to 1", () => {
		const onPageChange = vi.fn<(page: number) => void>();
		const onPageSizeChange = vi.fn<(pageSize: number, page: number) => void>();
		const props = { pageSize: 10, defaultPage: 3, onPageChange, onPageSizeChange };
		const { result, rerender } = renderHook((p) => useOffsetPagination(p), {
			initialProps: { ...props, listSize: 100 },
		});
		act(() => result.current.setPageSize(50));
		rerender({ ...props, listSize: 90 });
		expect(result.current.currentPage).toBe(1);
		expect(onPageChange).toHaveBeenLastCalledWith(1);
	});

	test("gaining then dropping onPageSizeChange shows the prop size", () => {
		const onPageSizeChange = vi.fn<(pageSize: number, page: number) => void>();
		const initialProps: UseOffsetPaginationProps = { listSize: 500, pageSize: 20 };
		const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
			initialProps,
		});
		act(() => result.current.setPageSize(50));
		rerender({ listSize: 500, pageSize: 20, onPageSizeChange });
		rerender({ listSize: 500, pageSize: 20 });
		expect(result.current.pageSize).toBe(20);
	});

	test("dropping onPageSizeChange keeps the size and the page", () => {
		const onPageSizeChange = vi.fn<(pageSize: number, page: number) => void>();
		const initialProps: UseOffsetPaginationProps = {
			listSize: 500,
			pageSize: 20,
			defaultPage: 4,
			onPageSizeChange,
		};
		const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
			initialProps,
		});
		rerender({ listSize: 500, pageSize: 50, defaultPage: 4, onPageSizeChange });
		rerender({ listSize: 500, pageSize: 50, defaultPage: 4, onPageSizeChange: undefined });
		expect(result.current.pageSize).toBe(50);
		expect(result.current.currentPage).toBe(4);
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

		// Regression: `Math.min(NaN, totalPages)` is `NaN`, so a malformed URL
		// param such as `?page=abc` made `currentPage` and `offset` `NaN`.
		test("NaN reads as page 1", () => {
			const { result } = renderHook(() =>
				useOffsetPagination({ listSize: 50, pageSize: 10, defaultPage: Number.NaN }),
			);
			expect(result.current.currentPage).toBe(1);
			expect(result.current.offset).toBe(0);
			expect(result.current.hasPreviousPage).toBe(false);
		});

		test("a fraction rounds down", () => {
			const { result } = renderHook(() =>
				useOffsetPagination({ listSize: 50, pageSize: 10, defaultPage: 2.5 }),
			);
			expect(result.current.currentPage).toBe(2);
			expect(result.current.offset).toBe(10);
		});
	});

	test("goToPage reports the floored page", () => {
		const onPageChange = vi.fn<(page: number) => void>();
		const { result } = renderHook(() =>
			useOffsetPagination({ listSize: 50, pageSize: 10, page: 1, onPageChange }),
		);
		act(() => result.current.goToPage(3.9));
		expect(onPageChange).toHaveBeenCalledTimes(1);
		expect(onPageChange).toHaveBeenLastCalledWith(3);
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

		test("nextPage on the last page does not call onPageChange", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const { result } = renderHook(() =>
				useOffsetPagination({ listSize: 25, pageSize: 10, page: 3, onPageChange }),
			);
			act(() => result.current.nextPage());
			expect(onPageChange).not.toHaveBeenCalled();
		});

		test("previousPage on the first page does not call onPageChange", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const { result } = renderHook(() =>
				useOffsetPagination({ listSize: 25, pageSize: 10, page: 1, onPageChange }),
			);
			act(() => result.current.previousPage());
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

		test("a pageSize change does not call onPageChange", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 500, pageSize: 10, page: 4, onPageChange },
			});
			rerender({ listSize: 500, pageSize: 50, page: 4, onPageChange });
			expect(onPageChange).not.toHaveBeenCalled();
			expect(result.current.currentPage).toBe(4);
			expect(result.current.offset).toBe(150);
		});

		// Regression: a back or forward move rewrote `pageSize` and `page` in the
		// URL at once, and the hook then reported page 1 over the given page.
		test("page and pageSize that change together keep the given page", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const onPageSizeChange = vi.fn<(pageSize: number, page: number) => void>();
			const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 500, pageSize: 50, page: 1, onPageChange, onPageSizeChange },
			});
			rerender({ listSize: 500, pageSize: 20, page: 3, onPageChange, onPageSizeChange });
			expect(result.current.currentPage).toBe(3);
			expect(result.current.pageSize).toBe(20);
			expect(result.current.offset).toBe(40);
			expect(onPageChange).not.toHaveBeenCalled();
			expect(onPageSizeChange).not.toHaveBeenCalled();
		});

		test("a list that shrinks under a controlled page and pageSize clamps the page", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const onPageSizeChange = vi.fn<(pageSize: number, page: number) => void>();
			const props = { pageSize: 20, page: 10, onPageChange, onPageSizeChange };
			const { result, rerender } = renderHook((p) => useOffsetPagination(p), {
				initialProps: { ...props, listSize: 500, resetPageOnListSizeChange: false },
			});
			rerender({ ...props, listSize: 45, resetPageOnListSizeChange: false });
			expect(result.current.currentPage).toBe(3);
			expect(result.current.offset).toBe(40);
			expect(onPageChange).not.toHaveBeenCalled();
		});

		test("onPageClamp stores the clamp, so a list that grows back stays on the shown page", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const onPageClamp = vi.fn<(page: number) => void>();
			const { result, rerender } = renderHook(
				({ listSize }) => {
					const [page, setPage] = useState(10);
					return useOffsetPagination({
						listSize,
						pageSize: 10,
						page,
						onPageChange,
						onPageClamp: (next) => {
							onPageClamp(next);
							setPage(next);
						},
						resetPageOnListSizeChange: false,
					});
				},
				{ initialProps: { listSize: 100 } },
			);
			// A list that loads has no items yet; a report then would erase page 10.
			rerender({ listSize: 0 });
			expect(onPageClamp).not.toHaveBeenCalled();
			rerender({ listSize: 25 });
			expect(onPageClamp).toHaveBeenCalledTimes(1);
			expect(onPageClamp).toHaveBeenLastCalledWith(3);
			rerender({ listSize: 100 });
			expect(result.current.currentPage).toBe(3);
			expect(onPageClamp).toHaveBeenCalledTimes(1);
			// Why a separate callback: the parent writes a correction in place,
			// and a navigation as a new history entry.
			expect(onPageChange).not.toHaveBeenCalled();
		});

		test("onPageClamp waits for a page the hook requested", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const onPageClamp = vi.fn<(page: number) => void>();
			const props = { pageSize: 10, onPageChange, onPageClamp, resetPageOnListSizeChange: false };
			const { result, rerender } = renderHook((p) => useOffsetPagination(p), {
				initialProps: { ...props, listSize: 100, page: 8 },
			});
			act(() => result.current.setPageSize(20));
			expect(onPageChange).toHaveBeenLastCalledWith(4);
			// The router has not committed page 4 yet when the list shrinks.
			rerender({ ...props, listSize: 50, page: 8 });
			expect(onPageClamp).not.toHaveBeenCalled();
			rerender({ ...props, listSize: 50, page: 4 });
			expect(result.current.pageSize).toBe(20);
			expect(result.current.currentPage).toBe(3);
			expect(onPageClamp).toHaveBeenLastCalledWith(3);

			rerender({ ...props, listSize: 50, page: 3 });
			// The router has not committed page 1 yet when the list shrinks.
			act(() => result.current.goToFirstPage());
			rerender({ ...props, listSize: 20, page: 3 });
			expect(onPageClamp).toHaveBeenCalledTimes(1);
		});

		test("onPageClamp skips a NaN page size", () => {
			const onPageClamp = vi.fn<(page: number) => void>();
			const { rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 100, pageSize: 10, page: 4, onPageClamp },
			});
			rerender({ listSize: 100, pageSize: Number.NaN, page: 4, onPageClamp });
			expect(onPageClamp).not.toHaveBeenCalled();
		});

		test("a list reset does not repeat a clamp to page 1", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const onPageClamp = vi.fn<(page: number) => void>();
			const { rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 8, pageSize: 10, page: 8, onPageChange, onPageClamp },
			});
			expect(onPageClamp).toHaveBeenLastCalledWith(1);
			rerender({ listSize: 9, pageSize: 10, page: 8, onPageChange, onPageClamp });
			expect(onPageChange).not.toHaveBeenCalled();
		});

		test("onPageClamp is not repeated when only the size changes", () => {
			const onPageClamp = vi.fn<(page: number) => void>();
			const { rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 15, pageSize: 10, page: 8, onPageClamp },
			});
			expect(onPageClamp).toHaveBeenLastCalledWith(2);
			rerender({ listSize: 15, pageSize: 11, page: 8, onPageClamp });
			expect(onPageClamp).toHaveBeenCalledTimes(1);
		});

		test("a navigation cancels a resize, so a clamp to its page keeps the size", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const onPageClamp = vi.fn<(page: number) => void>();
			const props = { pageSize: 10, onPageChange, onPageClamp, resetPageOnListSizeChange: false };
			const { result, rerender } = renderHook((p) => useOffsetPagination(p), {
				initialProps: { ...props, listSize: 100, page: 8 },
			});
			act(() => result.current.setPageSize(20));
			act(() => result.current.goToPage(6));
			rerender({ ...props, listSize: 100, page: 6 });
			rerender({ ...props, listSize: 40, page: 6 });
			expect(onPageClamp).toHaveBeenLastCalledWith(4);
			rerender({ ...props, listSize: 40, page: 4 });
			expect(result.current.pageSize).toBe(10);
			expect(onPageClamp).toHaveBeenCalledTimes(1);
		});

		test("a navigation without onPageChange does not hold back onPageClamp", () => {
			const onPageClamp = vi.fn<(page: number) => void>();
			const props = { pageSize: 10, page: 8, onPageClamp, resetPageOnListSizeChange: false };
			const initialProps: UseOffsetPaginationProps = { ...props, listSize: 100 };
			const { result, rerender } = renderHook((p) => useOffsetPagination(p), { initialProps });
			act(() => result.current.goToFirstPage());
			rerender({ ...props, listSize: 25, onPageChange: vi.fn<(page: number) => void>() });
			expect(onPageClamp).toHaveBeenLastCalledWith(3);
		});

		test("a list reset after a page 1 request that never landed still reports page 1", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 100, pageSize: 10, page: 5, onPageChange },
			});
			act(() => result.current.goToFirstPage());
			rerender({ listSize: 90, pageSize: 10, page: 5, onPageChange });
			expect(onPageChange).toHaveBeenCalledTimes(2);
			expect(onPageChange).toHaveBeenLastCalledWith(1);
		});

		test("onPageClamp waits for the size when the parent commits the page first", () => {
			const onPageSizeChange = vi.fn<(pageSize: number, page: number) => void>();
			const onPageClamp = vi.fn<(page: number) => void>();
			const props = {
				listSize: 15,
				onPageSizeChange,
				onPageClamp,
				resetPageOnListSizeChange: false,
			};
			const { result, rerender } = renderHook((p) => useOffsetPagination(p), {
				initialProps: { ...props, page: 2, pageSize: 10 },
			});
			act(() => result.current.setPageSize(5));
			expect(onPageSizeChange).toHaveBeenLastCalledWith(5, 3);
			rerender({ ...props, page: 3, pageSize: 10 });
			expect(onPageClamp).not.toHaveBeenCalled();
			rerender({ ...props, page: 3, pageSize: 5 });
			expect(result.current.currentPage).toBe(3);
			expect(result.current.offset).toBe(10);
		});

		test("a list reset to the page a resize asked for keeps the size", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const { result, rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 100, pageSize: 10, page: 2, onPageChange },
			});
			act(() => result.current.setPageSize(20));
			expect(onPageChange).toHaveBeenLastCalledWith(1);
			rerender({ listSize: 99, pageSize: 10, page: 2, onPageChange });
			rerender({ listSize: 99, pageSize: 10, page: 1, onPageChange });
			expect(result.current.pageSize).toBe(20);
		});

		test("a back move cancels a resize, so a clamp to its page keeps the size", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const onPageClamp = vi.fn<(page: number) => void>();
			const props = { pageSize: 10, onPageChange, onPageClamp, resetPageOnListSizeChange: false };
			const { result, rerender } = renderHook((p) => useOffsetPagination(p), {
				initialProps: { ...props, listSize: 100, page: 8 },
			});
			act(() => result.current.setPageSize(20));
			rerender({ ...props, listSize: 100, page: 6 });
			rerender({ ...props, listSize: 40, page: 6 });
			expect(onPageClamp).toHaveBeenLastCalledWith(4);
			rerender({ ...props, listSize: 40, page: 4 });
			expect(result.current.pageSize).toBe(10);
			expect(onPageClamp).toHaveBeenCalledTimes(1);
		});

		test("a list reset without onPageChange still reports the clamp", () => {
			const onPageClamp = vi.fn<(page: number) => void>();
			const { rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 100, pageSize: 10, page: 8, onPageClamp },
			});
			rerender({ listSize: 8, pageSize: 10, page: 8, onPageClamp });
			expect(onPageClamp).toHaveBeenLastCalledWith(1);
		});

		test("dropping page after a clamp to page 1 still resets the hook's own page", () => {
			const onPageClamp = vi.fn<(page: number) => void>();
			const initialProps: UseOffsetPaginationProps = {
				listSize: 8,
				pageSize: 10,
				page: 4,
				defaultPage: 4,
				onPageClamp,
			};
			const { result, rerender } = renderHook((p) => useOffsetPagination(p), { initialProps });
			expect(onPageClamp).toHaveBeenLastCalledWith(1);
			rerender({ listSize: 100, pageSize: 10, defaultPage: 4, onPageClamp });
			expect(result.current.currentPage).toBe(1);
		});

		test("a clamp that lands with a new size lets the next clamp report", () => {
			const onPageClamp = vi.fn<(page: number) => void>();
			const props = { listSize: 25, onPageClamp, resetPageOnListSizeChange: false };
			const { rerender } = renderHook((p) => useOffsetPagination(p), {
				initialProps: { ...props, page: 8, pageSize: 10 },
			});
			expect(onPageClamp).toHaveBeenLastCalledWith(3);
			rerender({ ...props, page: 3, pageSize: 20 });
			expect(onPageClamp).toHaveBeenLastCalledWith(2);
		});

		test("a list reset without onPageChange keeps a resize that waits for its page", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const initialProps: UseOffsetPaginationProps = {
				listSize: 100,
				pageSize: 10,
				page: 8,
				onPageChange,
			};
			const { result, rerender } = renderHook((p) => useOffsetPagination(p), { initialProps });
			act(() => result.current.setPageSize(20));
			expect(onPageChange).toHaveBeenLastCalledWith(4);
			rerender({ listSize: 99, pageSize: 10, page: 8 });
			rerender({ listSize: 99, pageSize: 10, page: 4, onPageChange });
			expect(result.current.pageSize).toBe(20);
			expect(result.current.offset).toBe(60);
		});

		test("a resize that keeps the page replaces a resize that never reached the parent", () => {
			const { result, rerender } = renderHook(
				({ listSize }) => {
					const [page, setPage] = useState(3);
					return useOffsetPagination({
						listSize,
						pageSize: 25,
						page,
						onPageClamp: setPage,
						resetPageOnListSizeChange: false,
					});
				},
				{ initialProps: { listSize: 100 } },
			);
			act(() => result.current.setPageSize(50));
			act(() => result.current.setPageSize(20));
			rerender({ listSize: 40 });
			expect(result.current.pageSize).toBe(20);
			expect(result.current.currentPage).toBe(2);
		});

		test("dropping page cancels a resize that waits for its page", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const initialProps: UseOffsetPaginationProps = {
				listSize: 80,
				pageSize: 10,
				page: 8,
				onPageChange,
			};
			const { result, rerender } = renderHook((p) => useOffsetPagination(p), { initialProps });
			act(() => result.current.setPageSize(20));
			rerender({ listSize: 80, pageSize: 10, onPageChange });
			rerender({ listSize: 80, pageSize: 10, page: 4, onPageChange });
			expect(result.current.pageSize).toBe(10);
		});

		test("a resize in a layout effect is not undone by the clamp for the old size", () => {
			const { result } = renderHook(() => {
				const [page, setPage] = useState(3);
				const pagination = useOffsetPagination({
					listSize: 15,
					pageSize: 10,
					page,
					onPageChange: setPage,
					onPageClamp: setPage,
				});
				const resized = useRef(false);
				const { setPageSize } = pagination;
				useLayoutEffect(() => {
					if (!resized.current) {
						resized.current = true;
						setPageSize(5);
					}
				}, [setPageSize]);
				return pagination;
			});
			expect(result.current.currentPage).toBe(3);
			expect(result.current.offset).toBe(10);
		});

		test("a resize in a mount effect overrides the clamp that waits", () => {
			const { result } = renderHook(() => {
				const [page, setPage] = useState(3);
				const pagination = useOffsetPagination({
					listSize: 15,
					pageSize: 10,
					page,
					onPageChange: setPage,
					onPageClamp: setPage,
				});
				const resized = useRef(false);
				const { setPageSize } = pagination;
				useEffect(() => {
					if (!resized.current) {
						resized.current = true;
						setPageSize(5);
					}
				}, [setPageSize]);
				return pagination;
			});
			// Item 11 starts page 2 at 10 a page, and page 3 at 5 a page.
			expect(result.current.currentPage).toBe(3);
			expect(result.current.offset).toBe(10);
		});

		test("a page repair at the same size does not hold back the next clamp", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const onPageClamp = vi.fn<(page: number) => void>();
			const props = { pageSize: 10, onPageChange, resetPageOnListSizeChange: false };
			const initialProps: UseOffsetPaginationProps = { ...props, listSize: 15, page: 8 };
			const { result, rerender } = renderHook((p) => useOffsetPagination(p), { initialProps });
			act(() => result.current.setPageSize(10));
			expect(onPageChange).toHaveBeenLastCalledWith(2);
			rerender({ ...props, listSize: 15, page: 2, onPageClamp });
			rerender({ ...props, listSize: 5, page: 2, onPageClamp });
			expect(onPageClamp).toHaveBeenLastCalledWith(1);
		});

		test("a resize back to the starting size in one batch does not hold back the next clamp", () => {
			const onPageClamp = vi.fn<(page: number) => void>();
			const props = { pageSize: 25, page: 2, onPageClamp, resetPageOnListSizeChange: false };
			const { result, rerender } = renderHook((p) => useOffsetPagination(p), {
				initialProps: { ...props, listSize: 100 },
			});
			act(() => {
				result.current.setPageSize(20);
				result.current.setPageSize(25);
			});
			rerender({ ...props, listSize: 15 });
			expect(onPageClamp).toHaveBeenLastCalledWith(1);
		});

		test("a parent that commits another size than the one requested still gets the clamp", () => {
			const onPageClamp = vi.fn<(page: number) => void>();
			const { result } = renderHook(() => {
				const [state, setState] = useState({ page: 2, pageSize: 20 });
				return useOffsetPagination({
					listSize: 35,
					...state,
					onPageSizeChange: (size, page) => setState({ page, pageSize: Math.max(10, size) }),
					onPageClamp,
				});
			});
			act(() => result.current.setPageSize(5));
			expect(onPageClamp).toHaveBeenLastCalledWith(4);
		});

		test("two resizes in one batch do not hold back the next clamp", () => {
			const onPageClamp = vi.fn<(page: number) => void>();
			const { result, rerender } = renderHook(
				({ listSize }) => {
					const [page, setPage] = useState(3);
					return useOffsetPagination({
						listSize,
						pageSize: 25,
						page,
						onPageChange: setPage,
						onPageClamp: (next) => {
							onPageClamp(next);
							setPage(next);
						},
						resetPageOnListSizeChange: false,
					});
				},
				{ initialProps: { listSize: 100 } },
			);
			act(() => {
				result.current.setPageSize(50);
				result.current.setPageSize(20);
			});
			rerender({ listSize: 15 });
			expect(onPageClamp).toHaveBeenLastCalledWith(1);
		});

		// Regression: separate effects for `pageSize` and `listSize` each called
		// `setPage(1)`, so one render that changed both reported page 1 twice.
		test("a pageSize and listSize change in one render reports page 1 once", () => {
			const onPageChange = vi.fn<(page: number) => void>();
			const { rerender } = renderHook((props) => useOffsetPagination(props), {
				initialProps: { listSize: 500, pageSize: 10, page: 4, onPageChange },
			});
			rerender({ listSize: 400, pageSize: 50, page: 4, onPageChange });
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
	});
});

test("getOffsetPaginatedSlice returns the current page of the list", () => {
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
});
