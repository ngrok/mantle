/**
 * Sorting modes
 * - alphanumeric: Sort by alphanumeric order (A-Z, 0-9, Z-A, 9-0)
 * - time: Sort by time (newest-to-oldest, oldest-to-newest)
 */
const sortingModes = ["alphanumeric", "time"] as const;

/**
 * Sorting modes
 * - alphanumeric: Sort by alphanumeric order (A-Z, 0-9, Z-A, 9-0)
 * - time: Sort by time (newest-to-oldest, oldest-to-newest)
 */
type SortingMode = (typeof sortingModes)[number];

/**
 * Type guard for sorting modes
 * - alphanumeric: Sort by alphanumeric order (A-Z, 0-9, Z-A, 9-0)
 * - time: Sort by time (newest-to-oldest, oldest-to-newest)
 *
 * @example isSortingMode("alphanumeric") // true
 * @example isSortingMode("time") // true
 * @example isSortingMode("foo") // false
 */
const isSortingMode = (value: unknown): value is SortingMode =>
	typeof value === "string" && sortingModes.some((item) => item === value);

/**
 * Runtime type-to-value helper for sorting modes
 * - alphanumeric: Sort by alphanumeric order (A-Z, 0-9, Z-A, 9-0)
 * - time: Sort by time (newest-to-oldest, oldest-to-newest)
 *
 * @example $sortingMode("alphanumeric") // "alphanumeric"
 * @example $sortingMode("time") // "time"
 */
const $sortingMode = <T extends SortingMode = SortingMode>(value: T) => value;

/**
 * Sorting directions
 * - asc: Ascending order (alphanumeric: A-Z, 0-9; time: oldest-to-newest)
 * - desc: Descending order (alphanumeric: Z-A, 9-0; time: newest-to-oldest)
 */
const sortingDirections = ["asc", "desc"] as const;

/**
 * Sorting directions
 * - asc: Ascending order (alphanumeric: A-Z, 0-9; time: oldest-to-newest)
 * - desc: Descending order (alphanumeric: Z-A, 9-0; time: newest-to-oldest)
 */
type SortingDirection = (typeof sortingDirections)[number];

/**
 * Type guard for sorting directions
 * - asc: Ascending order (alphanumeric: A-Z, 0-9; time: oldest-to-newest)
 * - desc: Descending order (alphanumeric: Z-A, 9-0; time: newest-to-oldest)
 *
 * @example isSortingDirection("asc") // true
 * @example isSortingDirection("desc") // true
 * @example isSortingDirection("foo") // false
 */
const isSortingDirection = (value: unknown): value is SortingDirection =>
	typeof value === "string" && sortingDirections.some((item) => item === value);

/**
 * Runtime type-to-value helper for sorting directions
 * - asc: Ascending order (alphanumeric: A-Z, 0-9; time: oldest-to-newest)
 * - desc: Descending order (alphanumeric: Z-A, 9-0; time: newest-to-oldest)
 *
 * @example $sortingDirection("asc") // "asc"
 * @example $sortingDirection("desc") // "desc"
 */
const $sortingDirection = <T extends SortingDirection = SortingDirection>(value: T) => value;

/**
 * Alphanumeric sorting directions
 * - asc: Ascending order (A-Z, 0-9)
 * - desc: Descending order (Z-A, 9-0)
 */
const alphanumericSortingDirections = [...sortingDirections] as const;

/**
 * Alphanumeric sorting directions
 * - asc: Ascending order (A-Z, 0-9)
 * - desc: Descending order (Z-A, 9-0)
 */
type AlphanumericSortingDirection = (typeof alphanumericSortingDirections)[number];

/**
 * Type guard for alphanumeric sorting directions
 * - asc: Ascending order (A-Z, 0-9)
 * - desc: Descending order (Z-A, 9-0)
 *
 * @example isAlphanumericSortingDirection("asc") // true
 * @example isAlphanumericSortingDirection("desc") // true
 * @example isAlphanumericSortingDirection("foo") // false
 */
const isAlphanumericSortingDirection = (value: unknown): value is AlphanumericSortingDirection =>
	typeof value === "string" && alphanumericSortingDirections.some((item) => item === value);

/**
 * Runtime type-to-value helper for alphanumeric sorting directions
 * - asc: Ascending order (A-Z, 0-9)
 * - desc: Descending order (Z-A, 9-0)
 *
 * @example $alphanumericSortingDirection("asc") // "asc"
 * @example $alphanumericSortingDirection("desc") // "desc"
 */
const $alphanumericSortingDirection = <
	T extends AlphanumericSortingDirection = AlphanumericSortingDirection,
>(
	value: T,
) => value;

/**
 * Time sorting directions
 * - newest-to-oldest: Descending order (newest first, oldest last)
 * - oldest-to-newest: Ascending order (oldest first, newest last)
 */
const timeSortingDirections = ["newest-to-oldest", "oldest-to-newest"] as const;

/**
 * Time sorting directions
 * - newest-to-oldest: Descending order (newest first, oldest last)
 * - oldest-to-newest: Ascending order (oldest first, newest last)
 */
type TimeSortingDirection = (typeof timeSortingDirections)[number];

/**
 * Type guard for time sorting directions
 * - newest-to-oldest: Descending order (newest first, oldest last)
 * - oldest-to-newest: Ascending order (oldest first, newest last)
 *
 * @example isTimeSortingDirection("newest-to-oldest") // true
 * @example isTimeSortingDirection("oldest-to-newest") // true
 * @example isTimeSortingDirection("foo") // false
 * @example isTimeSortingDirection("asc") // false
 * @example isTimeSortingDirection("desc") // false
 */
const isTimeSortingDirection = (value: unknown): value is TimeSortingDirection =>
	typeof value === "string" && timeSortingDirections.some((item) => item === value);

/**
 * Converts a sorting direction to a time sorting direction
 * - asc -> oldest-to-newest
 * - desc -> newest-to-oldest
 */
const timeSortingByDirection = {
	asc: "oldest-to-newest",
	desc: "newest-to-oldest",
} as const satisfies Record<SortingDirection, TimeSortingDirection>;

/**
 * Runtime type-to-value helper for time sorting directions.
 * If given a sorting direction, it will convert it to a time sorting direction.
 * - newest-to-oldest: Descending order (desc; newest first, oldest last)
 * - oldest-to-newest: Ascending order (asc; oldest first, newest last)
 *
 * @example $timeSortingDirection("asc") // "oldest-to-newest"
 * @example $timeSortingDirection("desc") // "newest-to-oldest"
 * @example $timeSortingDirection("oldest-to-newest") // "oldest-to-newest"
 * @example $timeSortingDirection("newest-to-oldest") // "newest-to-oldest"
 */
function $timeSortingDirection<T extends TimeSortingDirection | SortingDirection>(value: T) {
	if (isSortingDirection(value)) {
		return timeSortingByDirection[value];
	}
	if (isTimeSortingDirection(value)) {
		return value;
	}
	throw new Error(`Invalid time sorting direction given: "${value}"`);
}

export {
	//,
	$alphanumericSortingDirection,
	$sortingDirection,
	$sortingMode,
	$timeSortingDirection,
	alphanumericSortingDirections,
	isAlphanumericSortingDirection,
	isSortingDirection,
	isSortingMode,
	isTimeSortingDirection,
	sortingDirections,
	sortingModes,
	timeSortingByDirection,
	timeSortingDirections,
};

export type {
	//,
	AlphanumericSortingDirection,
	SortingDirection,
	SortingMode,
	TimeSortingDirection,
};
