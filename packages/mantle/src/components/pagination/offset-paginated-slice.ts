import type { OffsetPaginationState } from "./use-offset-pagination.js";

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

export { getOffsetPaginatedSlice };
