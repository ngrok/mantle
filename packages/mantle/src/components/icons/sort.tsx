import { SortAscendingIcon } from "@phosphor-icons/react/SortAscending";
import { SortDescendingIcon } from "@phosphor-icons/react/SortDescending";
import {
	$timeSortingDirection,
	type AlphanumericSortingDirection,
	type SortingDirection,
	type SortingMode,
	type TimeSortingDirection,
} from "../../utils/sorting/direction.js";
import type { SvgAttributes } from "../icon/types.js";

type Props = SvgAttributes &
	(
		| {
				mode: Extract<SortingMode, "alphanumeric">;
				/**
				 * Sort by alphanumeric order in "ascending" (asc) or "descending" (desc) order.
				 * @example "asc" for A-Z, 0-9
				 * @example "desc" for Z-A, 0-9
				 */
				direction: AlphanumericSortingDirection;
		  }
		| {
				mode: Extract<SortingMode, "time">;
				/**
				 * Sort by time in "newest-to-oldest" (descending, desc) or "oldest-to-newest" (ascending, asc) order.
				 * @example "newest-to-oldest" for newest first (aka descending, desc)
				 * @example "oldest-to-newest" for oldest first (aka ascending, asc)
				 */
				direction: TimeSortingDirection | SortingDirection;
		  }
	);

/**
 * A sorting icon that can be used to indicate the sorting direction of a table column or list.
 * It is aware of the sorting mode (alphanumeric or time) and the sorting direction (ascending or descending).
 *
 * @see https://mantle.ngrok.com/components/data-display/icons
 *
 * @example
 * ```tsx
 * <SortIcon mode="time" direction="newest-to-oldest" />
 * ```
 */
const SortIcon = ({ mode, direction, ...props }: Props) => {
	switch (mode) {
		case "alphanumeric": {
			switch (direction) {
				case "asc":
					return <SortAscendingIcon {...props} />;
				case "desc":
					return <SortDescendingIcon {...props} />;
				default:
					throw new Error(`Invalid alphanumeric sorting direction given: "${direction}"`);
			}
		}
		case "time": {
			const timeSortingDirection = $timeSortingDirection(direction);

			switch (timeSortingDirection) {
				case "oldest-to-newest":
					return <SortDescendingIcon {...props} />;
				case "newest-to-oldest":
					return <SortAscendingIcon {...props} />;
				default:
					throw new Error(`Invalid time sorting direction given: "${direction}"`);
			}
		}
	}
};
export {
	//,
	SortIcon,
};
