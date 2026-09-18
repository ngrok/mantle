import { describe, expect, test } from "vitest";
import type { SortingMode } from "../../utils/sorting/direction.js";
import { getNextInCircularList, getNextSortDirection } from "./helpers.js";
import type { SortDirection } from "./types.js";

describe("getNextInCircularList", () => {
	test("given an empty list, returns undefined", () => {
		expect(getNextInCircularList([], "unsorted")).toBeUndefined();
	});

	test("given a list and an item not in the list, returns undefined", () => {
		expect(getNextInCircularList(["unsorted", "asc"], "desc")).toBeUndefined();
	});

	test("given a list with one item, returns the first item", () => {
		expect(getNextInCircularList(["unsorted"], "unsorted")).toBe("unsorted");
	});

	test("correctly cycles through all items in a list", () => {
		const list = ["unsorted", "asc", "desc"];
		let currentItem: string | undefined = "unsorted";

		currentItem = getNextInCircularList(list, currentItem);
		expect(currentItem).toBe("asc");

		currentItem = getNextInCircularList(list, currentItem);
		expect(currentItem).toBe("desc");

		currentItem = getNextInCircularList(list, currentItem);
		expect(currentItem).toBe("unsorted");
	});
});

describe("getNextSortDirection", () => {
	test("for alphanumeric sorting mode, correctly cycles through the list", () => {
		let currentSortDirection: SortDirection = "unsorted";
		const sortingMode: SortingMode = "alphanumeric";

		currentSortDirection = getNextSortDirection(currentSortDirection, sortingMode);
		expect(currentSortDirection).toBe("asc");

		currentSortDirection = getNextSortDirection(currentSortDirection, sortingMode);
		expect(currentSortDirection).toBe("desc");

		currentSortDirection = getNextSortDirection(currentSortDirection, sortingMode);
		expect(currentSortDirection).toBe("unsorted");

		currentSortDirection = getNextSortDirection(currentSortDirection, sortingMode);
		expect(currentSortDirection).toBe("asc");
	});

	test("for time sorting mode, correctly cycles through the list", () => {
		let currentSortDirection: SortDirection = "unsorted";
		const sortingMode: SortingMode = "time";

		currentSortDirection = getNextSortDirection(currentSortDirection, sortingMode);
		expect(currentSortDirection).toBe("desc");

		currentSortDirection = getNextSortDirection(currentSortDirection, sortingMode);
		expect(currentSortDirection).toBe("asc");

		currentSortDirection = getNextSortDirection(currentSortDirection, sortingMode);
		expect(currentSortDirection).toBe("unsorted");

		currentSortDirection = getNextSortDirection(currentSortDirection, sortingMode);
		expect(currentSortDirection).toBe("desc");
	});
});
