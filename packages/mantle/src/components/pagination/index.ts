/**
 * Re-exports for the Pagination component family: `CursorPagination`'s parts
 * for cursor paging, `useOffsetPagination` for offset paging, and
 * `PaginationRange` for the count line of a list whose total is known.
 *
 * @useWhen Move through paged data one page at a time, with a cursor or an offset.
 *
 * @see https://mantle.ngrok.com/components/navigation/pagination
 */

import * as CursorPaginationParts from "./cursor-pagination-parts.js";

/**
 * A pagination component for use with cursor-based pagination.
 *
 * Cursor-based pagination is a way of loading data in chunks by using a cursor
 * from the last item on the current page to know where to start the next set,
 * making sure nothing is missed or repeated. Like a linked list, but for chunks
 * of data. It doesn't let you jump to a specific page or know how many total pages
 * there are, but it's more efficient for large or real-time data sets.
 *
 * @see https://mantle.ngrok.com/components/navigation/pagination
 *
 * @example
 * Composition:
 * ```
 * CursorPagination.Root
 * ├── CursorPagination.PageSizeSelect
 * ├── CursorPagination.PageSizeValue
 * └── CursorPagination.Buttons
 * ```
 *
 * @example
 * ```tsx
 * <CursorPagination.Root defaultPageSize={10}>
 *   <CursorPagination.Buttons
 *     hasNextPage={hasNext}
 *     hasPreviousPage={hasPrevious}
 *     onNextPage={handleNext}
 *     onPreviousPage={handlePrevious}
 *   />
 *   <CursorPagination.PageSizeSelect />
 * </CursorPagination.Root>
 * ```
 */
const CursorPagination = CursorPaginationParts;

export {
	//,
	CursorPagination,
};

export {
	//,
	PaginationRange,
} from "./pagination-range.js";

export { getOffsetPaginatedSlice } from "./offset-paginated-slice.js";
export { useOffsetPagination } from "./use-offset-pagination.js";

export type {
	//,
	CursorButtonsProps,
	CursorPageSizeSelectProps,
	CursorPageSizeValueProps,
	CursorPaginationProps,
} from "./cursor-pagination.js";

export type {
	//,
	PaginationNoun,
	PaginationRangeProps,
} from "./pagination-range.js";

export type {
	//,
	OffsetPaginationState,
	UseOffsetPaginationProps,
} from "./use-offset-pagination.js";
