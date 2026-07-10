"use client";

import { useEffect, useState } from "react";

type UseOffsetPaginationProps = {
	/**
	 * The total number of items in the list to be paginated.
	 */
	listSize: number;
	/**
	 * The number of items per page.
	 */
	pageSize: number;
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
 * A headless hook for managing offset-based pagination state
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
 */
function useOffsetPagination({
	listSize,
	pageSize,
}: UseOffsetPaginationProps): OffsetPaginationState {
	const [currentPage, setCurrentPage] = useState(1);
	const [currentPageSize, setCurrentPageSize] = useState(pageSize);

	// Reset the current page to 1 when the page size prop changes
	useEffect(() => {
		setCurrentPageSize(pageSize);
		setCurrentPage(1);
	}, [pageSize]);

	// Reset the current page to 1 when the list size prop changes
	useEffect(() => {
		setCurrentPage(1);
	}, [listSize]);

	const totalPages = Math.ceil(listSize / currentPageSize);
	const offset = (currentPage - 1) * currentPageSize;

	const hasPreviousPage = currentPage > 1;
	const hasNextPage = currentPage < totalPages;

	function goToPage(page: number) {
		const clampedPage = Math.max(1, Math.min(page, totalPages));
		setCurrentPage(clampedPage);
	}

	function nextPage() {
		if (hasNextPage) {
			setCurrentPage((prev) => Math.min(prev + 1, totalPages));
		}
	}

	function previousPage() {
		if (hasPreviousPage) {
			setCurrentPage((prev) => Math.max(prev - 1, 1));
		}
	}

	function setPageSize(size: number) {
		setCurrentPageSize(size);
		setCurrentPage(1); // reset to the first page when page size changes
	}

	function goToLastPage() {
		setCurrentPage(totalPages);
	}

	function goToFirstPage() {
		setCurrentPage(1);
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
