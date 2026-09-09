"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { type ComponentProps, createContext, useContext, useMemo, useState } from "react";
import invariant from "tiny-invariant";
import { cx } from "../../utils/cx/cx.js";
import { ButtonGroup, IconButton } from "../button/index.js";
import { Select } from "../select/select.js";
import { Separator } from "../separator/separator.js";

type CursorPaginationContextValue = {
	/**
	 * The current number of items per page.
	 */
	pageSize: number;
	/**
	 * Set the number of items per page. Calls `Root`'s `onChangePageSize` and,
	 * when uncontrolled, updates the internal state.
	 */
	setPageSize: (pageSize: number) => void;
};

const CursorPaginationContext = createContext<CursorPaginationContextValue | undefined>(undefined);

/**
 * The page size owner: either the root, seeded by `defaultPageSize`, or the
 * consumer, through `pageSize`. A union, so a call site passes exactly one.
 */
type CursorPaginationPageSizeProps =
	| {
			/**
			 * The initial number of items per page. The root owns the value after
			 * mount, and `PageSizeSelect` changes it. Read the changes back through
			 * `onChangePageSize`.
			 */
			defaultPageSize: number;
			pageSize?: never;
	  }
	| {
			defaultPageSize?: never;
			/**
			 * The controlled number of items per page. Pair it with
			 * `onChangePageSize`: `PageSizeSelect` calls that with the next value, and
			 * the select shows this prop until you change it. An external change, such
			 * as a browser history move that rewrites a URL param, updates the select.
			 */
			pageSize: number;
	  };

type CursorPaginationProps = ComponentProps<"div"> &
	CursorPaginationPageSizeProps & {
		/**
		 * Called with the next number of items per page when `PageSizeSelect`
		 * changes it. Required to change a controlled `pageSize`.
		 */
		onChangePageSize?: (pageSize: number) => void;
	};

/**
 * The root container for cursor-based pagination. It owns the page size that
 * `PageSizeSelect` and `PageSizeValue` read.
 *
 * Pass `defaultPageSize` to let the root own the page size, or pass `pageSize`
 * with `onChangePageSize` to own it yourself. The select shows the owner's
 * value in both modes, so an external change to a controlled `pageSize` updates
 * the select.
 *
 * Cursor-based pagination loads data in chunks. A cursor from the last item on
 * the current page marks where the next chunk starts, so no item is missed or
 * repeated. It cannot jump to a page or count the pages, but it stays efficient
 * for large or real-time data sets. For a page count and jumps, use
 * `useOffsetPagination`.
 *
 * @see https://mantle.ngrok.com/components/navigation/pagination#cursorpaginationroot
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
 *
 * @example
 * Controlled page size, kept in the URL:
 * ```tsx
 * const [searchParams, setSearchParams] = useSearchParams();
 * const pageSize = Number(searchParams.get("pageSize") ?? 10);
 *
 * <CursorPagination.Root
 *   pageSize={pageSize}
 *   onChangePageSize={(size) =>
 *     setSearchParams((params) => {
 *       params.set("pageSize", String(size));
 *       return params;
 *     })
 *   }
 * >
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
const Root = ({
	className,
	children,
	defaultPageSize,
	onChangePageSize,
	pageSize: pageSizeProp,
	ref,
	...props
}: CursorPaginationProps) => {
	const isControlled = pageSizeProp != null;
	const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);
	const pageSize = isControlled ? pageSizeProp : internalPageSize;

	// Why: the props union makes one of the two required, but a JavaScript
	// caller can still omit both, and `PageSizeValue` would render "undefined".
	invariant(
		pageSize != null,
		"CursorPagination.Root requires either `defaultPageSize` or `pageSize`",
	);

	const contextValue = useMemo<CursorPaginationContextValue>(
		() => ({
			pageSize,
			setPageSize: (next) => {
				if (!isControlled) {
					setInternalPageSize(next);
				}
				onChangePageSize?.(next);
			},
		}),
		[isControlled, onChangePageSize, pageSize],
	);

	return (
		<CursorPaginationContext.Provider value={contextValue}>
			<div
				data-slot="cursor-pagination"
				className={cx("inline-flex items-center justify-between gap-2", className)}
				ref={ref}
				{...props}
			>
				{children}
			</div>
		</CursorPaginationContext.Provider>
	);
};

type CursorButtonsProps = Omit<ComponentProps<typeof ButtonGroup>, "appearance"> & {
	/**
	 * Whether there is a next page of data to load.
	 */
	hasNextPage: boolean;
	/**
	 * Whether there is a previous page of data to load.
	 */
	hasPreviousPage: boolean;
	/**
	 * A callback that is called when the next page button is clicked.
	 */
	onNextPage?: () => void;
	/**
	 * A callback that is called when the previous page button is clicked.
	 */
	onPreviousPage?: () => void;
};

/**
 * A pair of buttons for navigating between pages of data when using cursor-based pagination.
 *
 * @see https://mantle.ngrok.com/components/navigation/pagination#cursorpaginationbuttons
 *
 * @example
 * ```tsx
 * <CursorPagination.Buttons
 *   hasNextPage={hasNext}
 *   hasPreviousPage={hasPrevious}
 *   onNextPage={() => loadNextPage()}
 *   onPreviousPage={() => loadPreviousPage()}
 * />
 * ```
 */
const Buttons = ({
	hasNextPage,
	hasPreviousPage,
	onNextPage,
	onPreviousPage,
	ref,
	...props
}: CursorButtonsProps) => {
	// TODO(cody): this _feels_ like a good spot for left and right arrow keys to navigate between pages when focused on the buttons

	return (
		<ButtonGroup data-slot="cursor-pagination-buttons" appearance="panel" ref={ref} {...props}>
			<IconButton
				data-slot="cursor-pagination-previous"
				appearance="ghost"
				disabled={!hasPreviousPage}
				icon={<CaretLeftIcon />}
				intent="neutral"
				label="Previous page"
				onClick={onPreviousPage}
				size="sm"
				type="button"
			/>
			<Separator
				data-slot="cursor-pagination-separator"
				orientation="vertical"
				className="min-h-5"
			/>
			<IconButton
				data-slot="cursor-pagination-next"
				appearance="ghost"
				disabled={!hasNextPage}
				icon={<CaretRightIcon />}
				intent="neutral"
				label="Next page"
				onClick={onNextPage}
				size="sm"
				type="button"
			/>
		</ButtonGroup>
	);
};

const defaultPageSizes = [5, 10, 20, 50, 100] as const;

type CursorPageSizeSelectProps = Omit<ComponentProps<typeof Select.Trigger>, "children"> & {
	/**
	 * The page sizes to choose from. The current page size must be in this list.
	 *
	 * @default [5, 10, 20, 50, 100]
	 */
	pageSizes?: typeof defaultPageSizes | readonly number[];
	/**
	 * Called with the next number of items per page when the user picks one.
	 * `Root`'s `onChangePageSize` runs first with the same value.
	 */
	onChangePageSize?: (pageSize: number) => void;
};

/**
 * A select input for changing the number of items per page when using cursor-based pagination.
 *
 * @see https://mantle.ngrok.com/components/navigation/pagination#cursorpaginationpagesizeselect
 *
 * @example
 * ```tsx
 * <CursorPagination.PageSizeSelect
 *   pageSizes={[10, 20, 50, 100]}
 *   onChangePageSize={(size) => console.log('Page size changed to:', size)}
 * />
 * ```
 */
const PageSizeSelect = ({
	className,
	pageSizes = defaultPageSizes,
	onChangePageSize,
	ref,
	...rest
}: CursorPageSizeSelectProps) => {
	const ctx = useContext(CursorPaginationContext);

	invariant(ctx, "CursorPageSizeSelect must be used as a child of a CursorPagination component");

	invariant(
		pageSizes.includes(ctx.pageSize),
		"CursorPagination.pageSize must be included in CursorPageSizeSelect.pageSizes",
	);

	return (
		<Select.Root
			// Why controlled: the context owns the page size in both modes, so an
			// external change to a controlled `pageSize` must update the select.
			value={`${ctx.pageSize}`}
			onValueChange={(value) => {
				const nextPageSize = Number.parseInt(value, 10);
				// Why: every item value is a stringified entry of `pageSizes`, so a
				// non-number means the list itself is broken.
				invariant(
					!Number.isNaN(nextPageSize),
					"CursorPageSizeSelect.pageSizes must contain only numbers",
				);
				ctx.setPageSize(nextPageSize);
				onChangePageSize?.(nextPageSize);
			}}
		>
			<Select.Trigger
				ref={ref}
				// Why: the trigger's only visible text is its value ("100 per page"),
				// so without a label a screen reader has no stable name for it.
				aria-label="Items per page"
				data-slot="cursor-pagination-page-size-select"
				className={cx("w-auto min-w-36", className)}
				{...rest}
			>
				{/* Why children: Radix fills an empty `Select.Value` from the selected
				    item on the client, after a layout effect, so the server HTML has
				    no trigger text. The page size is known, so render it directly. */}
				<Select.Value>{ctx.pageSize} per page</Select.Value>
			</Select.Trigger>
			<Select.Content width="trigger">
				{pageSizes.map((size) => (
					<Select.Item key={size} value={`${size}`}>
						{size} per page
					</Select.Item>
				))}
			</Select.Content>
		</Select.Root>
	);
};

type CursorPageSizeValueProps = Omit<ComponentProps<"span">, "children">;

/**
 * Displays the current page size when using cursor-based pagination as a read-only value.
 *
 * @see https://mantle.ngrok.com/components/navigation/pagination#cursorpaginationpagesizevalue
 *
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <span>Items per page:</span>
 *   <CursorPagination.PageSizeValue />
 * </div>
 * ```
 */
function PageSizeValue({ className, ...props }: CursorPageSizeValueProps) {
	const ctx = useContext(CursorPaginationContext);

	invariant(ctx, "CursorPageSizeValue must be used as a child of a CursorPagination component");

	return (
		<span
			data-slot="cursor-pagination-page-size-value"
			className={cx("text-muted text-sm font-normal", className)}
			{...props}
		>
			{ctx.pageSize} per page
		</span>
	);
}

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
const CursorPagination = {
	/**
	 * The root container for cursor-based pagination. It owns the page size that
	 * `PageSizeSelect` and `PageSizeValue` read.
	 *
	 * Pass `defaultPageSize` to let the root own the page size, or pass `pageSize`
	 * with `onChangePageSize` to own it yourself. The select shows the owner's
	 * value in both modes, so an external change to a controlled `pageSize` updates
	 * the select.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/pagination#cursorpaginationroot
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
	 *
	 * @example
	 * Controlled page size, kept in the URL:
	 * ```tsx
	 * const [searchParams, setSearchParams] = useSearchParams();
	 * const pageSize = Number(searchParams.get("pageSize") ?? 10);
	 *
	 * <CursorPagination.Root
	 *   pageSize={pageSize}
	 *   onChangePageSize={(size) =>
	 *     setSearchParams((params) => {
	 *       params.set("pageSize", String(size));
	 *       return params;
	 *     })
	 *   }
	 * >
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
	Root,
	/**
	 * A pair of buttons for navigating between pages of data when using cursor-based pagination.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/pagination#cursorpaginationbuttons
	 *
	 * @example
	 * ```tsx
	 * <CursorPagination.Buttons
	 *   hasNextPage={hasNext}
	 *   hasPreviousPage={hasPrevious}
	 *   onNextPage={() => loadNextPage()}
	 *   onPreviousPage={() => loadPreviousPage()}
	 * />
	 * ```
	 */
	Buttons,
	/**
	 * A select input for changing the number of items per page when using cursor-based pagination.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/pagination#cursorpaginationpagesizeselect
	 *
	 * @example
	 * ```tsx
	 * <CursorPagination.PageSizeSelect
	 *   pageSizes={[10, 20, 50, 100]}
	 *   onChangePageSize={(size) => console.log('Page size changed to:', size)}
	 * />
	 * ```
	 */
	PageSizeSelect,
	/**
	 * Displays the current page size when using cursor-based pagination as a read-only value.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/pagination#cursorpaginationpagesizevalue
	 *
	 * @example
	 * ```tsx
	 * <div className="flex items-center gap-2">
	 *   <span>Items per page:</span>
	 *   <CursorPagination.PageSizeValue />
	 * </div>
	 * ```
	 */
	PageSizeValue,
} as const;

export {
	//,
	CursorPagination,
};

export type {
	//,
	CursorButtonsProps,
	CursorPageSizeSelectProps,
	CursorPageSizeValueProps,
	CursorPaginationProps,
};
