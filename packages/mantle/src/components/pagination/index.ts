/**
 * Re-exports for the Pagination component family — `CursorPagination`'s parts
 * for cursor paging, `useOffsetPagination` for offset paging, and
 * `PaginationRange` for the count line of a list whose total is known.
 *
 * @useWhen Move through paged data one page at a time, with a cursor or an offset.
 *
 * @see https://mantle.ngrok.com/components/navigation/pagination
 */

export {
	//,
	CursorPagination,
} from "./cursor-pagination.js";

export {
	//,
	PaginationRange,
} from "./pagination-range.js";

export {
	//,
	getOffsetPaginatedSlice,
	useOffsetPagination,
} from "./use-offset-pagination.js";

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
