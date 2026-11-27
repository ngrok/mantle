"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseOffsetPaginationProps = {
	/**
	 * The total number of items in the list to paginate. A change resets the
	 * page to 1 unless `resetPageOnListSizeChange` is `false`.
	 */
	listSize: number;
	/**
	 * The number of items per page. With `onPageSizeChange`, the hook reads the
	 * page size from this prop and a change leaves the page alone. Without it,
	 * the prop sets the start value, and a change replaces the size that
	 * `setPageSize` set and moves the internal page to 1. A change never calls
	 * `onPageChange`: the parent that changes the page size owns the page.
	 */
	pageSize: number;
	/**
	 * Called with the next page size and the page that keeps the reader's place
	 * when `setPageSize` changes the size. Pass it to control the page size:
	 * the hook then reads the size back from `pageSize`. With it, `setPageSize`
	 * does not call `onPageChange`, so a parent that keeps both values in the
	 * URL writes them in one navigation.
	 */
	onPageSizeChange?: (pageSize: number, page: number) => void;
	/**
	 * The 1-indexed page to start on when uncontrolled. The hook owns the page
	 * after mount.
	 *
	 * @default 1
	 */
	defaultPage?: number;
	/**
	 * The controlled 1-indexed page. Pair it with `onPageChange`: the hook calls
	 * that with the next page and reads the page back from this prop. The hook
	 * normalizes the value in `currentPage` without a callback: a page past the
	 * end clamps to the last page, a fraction rounds down, and `NaN` reads as 1.
	 */
	page?: number;
	/**
	 * Called with the next 1-indexed page when the hook changes it: a navigation
	 * call, `setPageSize` without `onPageSizeChange`, or a `listSize` reset. Not called
	 * when the next page equals the stored page (`page` or the internal page).
	 * A move that lands on a normalized `currentPage` still calls it, so a stale
	 * `page` catches up.
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
	 * Set the number of items per page. The page moves to the one that holds the
	 * first item of the current page, clamped to the last page, so the reader
	 * keeps their place. A size that is not positive does nothing, and neither
	 * does a controlled size equal to the current one.
	 */
	setPageSize: (size: number) => void;
	/**
	 * The total number of pages.
	 */
	totalPages: number;
};

/**
 * Normalize a 1-indexed page into a whole number in `[1, totalPages]`. An empty
 * list has zero pages but still reports page 1, so the lower bound wins over
 * `totalPages`.
 */
function clampPage(page: number, totalPages: number): number {
	// Why: a URL param can carry `NaN` or a fraction, `Math.min` passes `NaN`
	// through, and a fractional page makes `offset` fractional.
	const wholePage = Number.isNaN(page) ? 1 : Math.floor(page);
	return Math.max(1, Math.min(wholePage, totalPages));
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
 *   onPageChange: (page) =>
 *     setSearchParams((params) => {
 *       params.set("page", String(page));
 *       return params;
 *     }),
 *   resetPageOnListSizeChange: false,
 * });
 * ```
 */
function useOffsetPagination({
	defaultPage = 1,
	listSize,
	onPageChange,
	onPageSizeChange,
	page: pageProp,
	pageSize,
	resetPageOnListSizeChange = true,
}: UseOffsetPaginationProps): OffsetPaginationState {
	const isPageControlled = pageProp != null;
	const isPageSizeControlled = onPageSizeChange != null;
	const [internalPage, setInternalPage] = useState(defaultPage);
	const [internalPageSize, setInternalPageSize] = useState(pageSize);
	const [previousPageSize, setPreviousPageSize] = useState(pageSize);
	// The internal page that `setPageSize` picked for a controlled size. It
	// applies once `pageSize` reports that size, so the page and the size
	// change in the same render.
	const [pendingPage, setPendingPage] = useState<{ page: number; size: number } | null>(null);
	// Why adjust during render and not in an effect: the change touches only
	// this hook's state, so the first render after it is already correct. Why
	// no `onPageChange`: a parent that changes `pageSize` sets the page in the
	// same update, as a URL does on a back or forward move. Why `Object.is`:
	// `NaN !== NaN`, so a `NaN` size would update state on each render.
	if (!Object.is(previousPageSize, pageSize)) {
		setPreviousPageSize(pageSize);
		// Why in both modes: a parent that drops `onPageSizeChange` must not
		// fall back to a stale size.
		setInternalPageSize(pageSize);
		// Why not for a controlled size: the prop is the size, and a router can
		// commit the echo of `setPageSize` a render late.
		if (!isPageSizeControlled) {
			setInternalPage(1);
		}
	}
	const currentPageSize = isPageSizeControlled ? pageSize : internalPageSize;

	const totalPages = Math.ceil(listSize / currentPageSize);
	// Why the clamp: `page` and `defaultPage` come from outside, and a shorter
	// list can leave the stored page past the end.
	const ownPage = pendingPage?.size === currentPageSize ? pendingPage.page : internalPage;
	const storedPage = isPageControlled ? pageProp : ownPage;
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
				setPendingPage(null);
			}
			onPageChange?.(next);
		},
		[isPageControlled, onPageChange, storedPage],
	);

	// Why the ref: an effect also runs on mount, and a mount must keep
	// `defaultPage` and `page`. Only a real change resets.
	const previousListSize = useRef(listSize);
	// Why an effect: the reset calls `onPageChange`, an external callback that
	// must not run during render.
	useEffect(() => {
		const listSizeChanged = previousListSize.current !== listSize;
		previousListSize.current = listSize;
		if (listSizeChanged && resetPageOnListSizeChange) {
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
		// Why: a size of 0 or `NaN` has no pages. A repeat of a controlled size
		// would write a duplicate URL entry. An internal size skips this check:
		// a second call in one batch sees the size of this render.
		if (!(size > 0) || (isPageSizeControlled && size === currentPageSize)) {
			return;
		}
		// Why keep the first item in view: a reset to page 1 loses the reader's
		// place in a long list.
		const nextPage = clampPage(Math.floor(offset / size) + 1, Math.ceil(listSize / size));
		if (isPageSizeControlled) {
			if (!isPageControlled) {
				// Why wait for the prop: the old size with the new page shows the
				// wrong rows until the parent commits the size.
				setPendingPage({ page: nextPage, size });
			}
			// Why one callback: two router writes in one tick do not compose, so
			// separate size and page callbacks lose one of the values.
			onPageSizeChange(size, nextPage);
			return;
		}
		setInternalPageSize(size);
		if (!isPageControlled) {
			// Why not `setPage`: it compares against the page of this render, and
			// a second resize in the same batch must still win.
			setInternalPage(nextPage);
			setPendingPage(null);
		}
		if (nextPage !== storedPage) {
			onPageChange?.(nextPage);
		}
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

export { useOffsetPagination };

export type {
	//,
	OffsetPaginationState,
	UseOffsetPaginationProps,
};
