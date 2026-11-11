import { Children, type ComponentProps, cloneElement, isValidElement, type ReactNode } from "react";
import invariant from "tiny-invariant";
import type { SelfClosingWithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot, type WithDataSlot } from "../../utils/data-slot.js";
import { Slot } from "../slot/index.js";

/**
 * The noun a count line counts, in both grammatical numbers. Pass both forms,
 * because an English plural is irregular: "IP policy" becomes "IP policies".
 */
type PaginationNoun = {
	/** The form for a count of exactly 1. */
	singular: string;
	/** The form for every other count, 0 included. */
	plural: string;
};

/** The page and the list that `formatPaginationRange` describes. */
type PaginationRangeValue = {
	/**
	 * The index of the first row on the page, from 0. For `useOffsetPagination`,
	 * pass its `offset`. For a TanStack table, pass `pageIndex * pageSize`.
	 */
	offset: number;
	/** The most rows a page holds. Must be a positive integer. */
	pageSize: number;
	/** How many rows the list holds after its filter. Must be a non-negative integer. */
	total: number;
	/**
	 * The noun to count.
	 *
	 * @default { singular: "result", plural: "results" }
	 */
	noun?: PaginationNoun;
};

// Why a fixed locale: the server and the client must group digits the same
// way, or the hydration text does not match.
const countFormat = new Intl.NumberFormat("en-US");

const defaultNoun: PaginationNoun = { singular: "result", plural: "results" };

/**
 * The count line for one page of a list: empty for an empty list, the total
 * when one page holds every row, and the range of the page otherwise.
 *
 * An empty list gets no text, because the list shows its own empty state. One
 * page gets no range, because the range repeats the rows above it. Throws when
 * a count is out of range.
 *
 * @example
 * ```ts
 * const noun = { singular: "domain", plural: "domains" };
 * formatPaginationRange({ offset: 0, pageSize: 20, total: 2396, noun }); // "1–20 of 2,396 domains"
 * formatPaginationRange({ offset: 2380, pageSize: 20, total: 2396, noun }); // "2,381–2,396 of 2,396 domains"
 * formatPaginationRange({ offset: 0, pageSize: 20, total: 1, noun }); // "1 domain"
 * formatPaginationRange({ offset: 0, pageSize: 20, total: 0, noun }); // ""
 * ```
 */
function formatPaginationRange({
	offset,
	pageSize,
	total,
	noun = defaultNoun,
}: PaginationRangeValue): string {
	invariant(
		Number.isInteger(pageSize) && pageSize > 0,
		`PaginationRange: \`pageSize\` must be a positive integer, received ${String(pageSize)}.`,
	);
	invariant(
		Number.isInteger(total) && total >= 0,
		`PaginationRange: \`total\` must be a non-negative integer, received ${String(total)}.`,
	);
	invariant(
		Number.isInteger(offset) && offset >= 0,
		`PaginationRange: \`offset\` must be a non-negative integer, received ${String(offset)}.`,
	);
	if (total === 0) {
		return "";
	}
	const word = total === 1 ? noun.singular : noun.plural;
	if (total <= pageSize) {
		return `${countFormat.format(total)} ${word}`;
	}
	// Why the clamp: a list that shrinks under the current page leaves an
	// offset past its end until the page catches up.
	const start = Math.min(offset, total - 1) + 1;
	const end = Math.min(start + pageSize - 1, total);
	const range =
		start === end
			? countFormat.format(start)
			: `${countFormat.format(start)}–${countFormat.format(end)}`;
	return `${range} of ${countFormat.format(total)} ${word}`;
}

type PaginationRangeProps = Omit<ComponentProps<"span">, "children"> &
	SelfClosingWithAsChild &
	WithDataSlot &
	PaginationRangeValue;

/**
 * The count line beside a paginated list or table, such as "1–20 of 2,396
 * domains". It is a live region, so a screen reader announces the new range
 * when the page changes. Without it, the rows change and a screen reader says
 * nothing.
 *
 * The line shows the total alone when one page holds every row, and no text
 * for an empty list, because the list shows its own empty state. The element
 * renders in every state, because a live region added together with its text
 * is not announced.
 *
 * It takes `offset`, `pageSize`, and `total`, so the same part serves offset
 * state from `useOffsetPagination` beside a `Table` and a TanStack table
 * instance beside a `DataTable`. Place it in `CursorPagination.Root`, beside
 * the page-size select and the buttons. Digits group in `en-US`, so the server
 * and the client render the same text.
 *
 * **Polymorphism.** Pass `asChild` to render the text in your own element. The
 * child must have no children of its own, because the part renders the text.
 *
 * | Data Attribute | Value                | Description  |
 * | -------------- | -------------------- | ------------ |
 * | `data-slot`    | `"pagination-range"` | On the root. |
 *
 * @see https://mantle.ngrok.com/components/navigation/pagination#paginationrange
 *
 * @example
 * ```tsx
 * import { CursorPagination, PaginationRange, useOffsetPagination } from "@ngrok/mantle/pagination";
 *
 * const pagination = useOffsetPagination({ listSize: domains.length, pageSize: 20 });
 *
 * <CursorPagination.Root pageSize={pagination.pageSize} onChangePageSize={pagination.setPageSize}>
 *   <PaginationRange
 *     offset={pagination.offset}
 *     pageSize={pagination.pageSize}
 *     total={domains.length}
 *     noun={{ singular: "domain", plural: "domains" }}
 *   />
 *   <CursorPagination.PageSizeSelect />
 *   <CursorPagination.Buttons
 *     hasNextPage={pagination.hasNextPage}
 *     hasPreviousPage={pagination.hasPreviousPage}
 *     onNextPage={pagination.nextPage}
 *     onPreviousPage={pagination.previousPage}
 *   />
 * </CursorPagination.Root>
 * ```
 */
function PaginationRange({
	asChild = false,
	children,
	className,
	"data-slot": dataSlot,
	noun,
	offset,
	pageSize,
	total,
	...props
}: PaginationRangeProps) {
	const text = formatPaginationRange({ offset, pageSize, total, noun });
	const rootProps = {
		role: "status",
		"data-slot": joinDataSlot(dataSlot, "pagination-range"),
		className: cx("text-muted text-sm font-normal", className),
		...props,
	};

	if (!asChild) {
		return <span {...rootProps}>{text}</span>;
	}

	const child = Children.only(children);
	invariant(
		isValidElement<{ children?: ReactNode }>(child),
		"When using `asChild`, PaginationRange must be passed a single child as a JSX tag.",
	);
	invariant(
		child.props.children == null,
		"When using `asChild`, the child of PaginationRange must have no children of its own. The part renders the text.",
	);
	return <Slot {...rootProps}>{cloneElement(child, {}, text)}</Slot>;
}

export {
	//,
	formatPaginationRange,
	PaginationRange,
};

export type {
	//,
	PaginationNoun,
	PaginationRangeProps,
	PaginationRangeValue,
};
