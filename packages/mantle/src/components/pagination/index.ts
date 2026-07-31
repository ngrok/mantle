/**
 * Re-exports for the Pagination component family — `CursorPagination`'s parts
 * for cursor paging, and `useOffsetPagination` for offset paging.
 *
 * @see https://mantle.ngrok.com/components/navigation/pagination
 */

export {
	//,
	CursorPagination,
} from "./cursor-pagination.js";

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
	OffsetPaginationState,
	UseOffsetPaginationProps,
} from "./use-offset-pagination.js";
