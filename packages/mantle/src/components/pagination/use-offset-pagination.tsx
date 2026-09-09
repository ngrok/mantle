"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseOffsetPaginationProps = {
	/**
	 * The total number of items in the list to paginate. A change resets the
	 * page to 1 unless `resetPageOnListSizeChange` is `false`.
	 */
	listSize: number;
	/**
	 * The number of items per page. A change resets the page to 1.
	 */
	pageSize: number;
	/**
	 * The 1-indexed page to start on when uncontrolled. The hook owns the page
	 * after mount.
	 *
	 * @default 1
	 */
	defaultPage?: number;
	/**
	 * The controlled 1-indexed page. Pair it with `onPageChange`: the hook calls
	 * that with the next page and reads the page back from this prop. A value
	 * past the last page clamps in `currentPage` without a callback.
	 */
	page?: number;
	/**
	 * Called with the next 1-indexed page when the hook changes it: a navigation
	 * call, `setPageSize`, a `pageSize` change, or a `listSize` reset. Not called
	 * when the next page equals the current one.
	 */
	onPageChange?: (page: number) => void;
	/**
	 * Whether a `listSize` change resets the page to 1. Set `false` to stay on
	 * the current page: `currentPage` clamps to the new `totalPages`, so a
	 * refetch that shrinks the list lands on its last page instead of page 1.
	 *
	 * @default true
	 */
	resetPageOnListSizeChange?: boolean;
};

type OffsetPaginationState = {
	/**
	 * The current page number, 1-indexed (starting at 1).
	 */
	currentPage: number;
	/**
	 * Whether there is a previous page.
	 */
	hasPreviousPage: boolean;
	/**
	 * Whether there is a next page.
	 */
	hasNextPage: boolean;
	/**
	 * Go to a specific page.
	 */
	goToPage: (page: number) => void;
	/**
	 * Go to the first page.
	 */
	goToFirstPage: () => void;
	/**
	 * Go to the last page.
	 */
	goToLastPage: () => void;
	/**
	 * Go to the next page.
	 */
	nextPage: () => void;
	/**
	 * The offset of the current page in the list.
	 */
	offset: number;
	/**
	 * The number of items per page.
	 */
	pageSize: number;
	/**
	 * Go to the previous page.
	 */
	previousPage: () => void;
	/**
	 * Set the number of items per page. This will reset the current page to the first page.
	 */
	setPageSize: (size: number) => void;
	/**
	 * The total number of pages.
	 */
	totalPages: number;
};

/**
 * Clamp a 1-indexed page into `[1, totalPages]`. An empty list has zero pages
 * but still reports page 1, so the lower bound wins over `totalPages`.
 */
function clampPage(page: number, totalPages: number): number {
	return Math.max(1, Math.min(page, totalPages));
}

/**
 * A headless hook for offset-based pagination state. It owns the page by
 * default; pass `page` with `onPageChange` to own it yourself, for example in
 * the URL.
 *
 * @example
 * ```tsx
 * const pagination = useOffsetPagination({
 *   listSize: 150,
 *   pageSize: 10
 * });
 *
 * return (
 *   <div>
 *     <p>Page {pagination.currentPage} of {pagination.totalPages}</p>
 *     <button onClick={pagination.previousPage} disabled={!pagination.hasPreviousPage}>
 *       Previous
 *     </button>
 *     <button onClick={pagination.nextPage} disabled={!pagination.hasNextPage}>
 *       Next
 *     </button>
 *   </div>
 * );
 * ```
 *
 * @example
 * Controlled page, kept in the URL, that survives a refetch:
 * ```tsx
 * const [searchParams, setSearchParams] = useSearchParams();
 * const pagination = useOffsetPagination({
 *   listSize: items.length,
 *   pageSize: 10,
 *   page: Number(searchParams.get("page") ?? 1),
 *   onPageChange: (page) => setSearchParams({ page: String(page) }),
 *   resetPageOnListSizeChange: false,
 * });
 * ```
 */
function useOffsetPagination({
	defaultPage = 1,
	listSize,
	onPageChange,
	page: pageProp,
	pageSize,
	resetPageOnListSizeChange = true,
}: UseOffsetPaginationProps): OffsetPaginationState {
	const isPageControlled = pageProp != null;
	const [internalPage, setInternalPage] = useState(defaultPage);
	const [currentPageSize, setCurrentPageSize] = useState(pageSize);

	const totalPages = Math.ceil(listSize / currentPageSize);
	// Why the clamp: `page` and `defaultPage` come from outside, and a shorter
	// list can leave the stored page past the end.
	const storedPage = isPageControlled ? pageProp : internalPage;
	const currentPage = clampPage(storedPage, totalPages);
	const offset = (currentPage - 1) * currentPageSize;

	const hasPreviousPage = currentPage > 1;
	const hasNextPage = currentPage < totalPages;

	const setPage = useCallback(
		(next: number) => {
			// Why compare the stored page: a clamped `currentPage` hides a stale
			// stored value, and a call that lands on the clamp must still repair it.
			if (next === storedPage) {
				return;
			}
			if (!isPageControlled) {
				setInternalPage(next);
			}
			onPageChange?.(next);
		},
		[isPageControlled, onPageChange, storedPage],
	);

	// Why the refs: an effect also runs on mount, and a mount must keep
	// `defaultPage` and `page`. Only a real change resets.
	const previousPageSize = useRef(pageSize);
	useEffect(() => {
		if (previousPageSize.current === pageSize) {
			return;
		}
		previousPageSize.current = pageSize;
		setCurrentPageSize(pageSize);
		// Why reset to page 1: the old index means something else against a new
		// page size. A larger page size can also put it past the new last page.
		setPage(1);
	}, [pageSize, setPage]);

	const previousListSize = useRef(listSize);
	useEffect(() => {
		if (previousListSize.current === listSize) {
			return;
		}
		previousListSize.current = listSize;
		if (resetPageOnListSizeChange) {
			setPage(1);
		}
	}, [listSize, resetPageOnListSizeChange, setPage]);

	function goToPage(page: number) {
		setPage(clampPage(page, totalPages));
	}

	function nextPage() {
		if (hasNextPage) {
			setPage(currentPage + 1);
		}
	}

	function previousPage() {
		if (hasPreviousPage) {
			setPage(currentPage - 1);
		}
	}

	function setPageSize(size: number) {
		setCurrentPageSize(size);
		setPage(1);
	}

	function goToLastPage() {
		setPage(clampPage(totalPages, totalPages));
	}

	function goToFirstPage() {
		setPage(1);
	}

	return {
		currentPage,
		goToFirstPage,
		goToLastPage,
		goToPage,
		hasNextPage,
		hasPreviousPage,
		nextPage,
		offset,
		pageSize: currentPageSize,
		previousPage,
		setPageSize,
		totalPages,
	};
}

/**
 * Get a paginated slice of a list based on the current offset pagination state.
 *
 * @example
 * ```tsx
 * const data = ['a', 'b', 'c', 'd', 'e', 'f'];
 * const pagination = useOffsetPagination({ listSize: data.length, pageSize: 2 });
 * const currentPageData = getOffsetPaginatedSlice(data, pagination);
 * // Returns: ['a', 'b'] for page 1, ['c', 'd'] for page 2, etc.
 * ```
 */
function getOffsetPaginatedSlice<T>(list: readonly T[], pagination: OffsetPaginationState): T[] {
	return list.slice(pagination.offset, pagination.offset + pagination.pageSize);
}

export {
	//,
	getOffsetPaginatedSlice,
	useOffsetPagination,
};

export type {
	//,
	OffsetPaginationState,
	UseOffsetPaginationProps,
};
