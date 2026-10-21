import type { SortingMode } from "../../utils/sorting/direction.js";
import type { SortDirection } from "./types.js";

const alphanumericSortingOrder = ["unsorted", "asc", "desc"] as const satisfies SortDirection[];

const timeSortingOrder = ["unsorted", "desc", "asc"] as const satisfies SortDirection[];

/**
 * Get the next sort direction based on the current sort direction and sorting mode.
 */
function getNextSortDirection(currentSortDirection: SortDirection, sortingMode: SortingMode) {
	const sortOrder = sortingMode === "alphanumeric" ? alphanumericSortingOrder : timeSortingOrder;

	return getNextInCircularList(sortOrder, currentSortDirection) ?? "unsorted";
}

/**
 * Get the next item in a circular list.
 * If the current item is not found in the list (or it's empty), return the fallback value.
 */
function getNextInCircularList<T>(list: T[], currentItem: T, fallback?: T) {
	if (list.length === 0) {
		return fallback;
	}

	const currentItemIndex = list.findIndex((item) => item === currentItem);
	if (currentItemIndex === -1) {
		return fallback;
	}

	const nextIndex = (currentItemIndex + 1) % list.length;
	return list.at(nextIndex) ?? fallback;
}

export {
	//,
	getNextSortDirection,
	getNextInCircularList,
};
