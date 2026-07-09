"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import {
	type ComponentProps,
	type ComponentRef,
	createContext,
	forwardRef,
	useContext,
	useState,
} from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { ButtonGroup, IconButton } from "../button/index.js";
import { Select } from "../select/select.js";
import { Separator } from "../separator/separator.js";
import { Slot } from "../slot/index.js";

type CursorPaginationContextValue = {
	/**
	 * The default number of items per page.
	 */
	defaultPageSize: number;
	/**
	 * The current number of items per page.
	 */
	pageSize: number;
	/**
	 * A function to set the number of items per page.
	 */
	setPageSize: (value: number) => void;
};

const CursorPaginationContext = createContext<CursorPaginationContextValue | undefined>(undefined);

type CursorPaginationProps = ComponentProps<"div"> & {
	/**
	 * The default number of items per page.
	 */
	defaultPageSize: number;
};

/**
 * A pagination component for use with cursor-based pagination.
 *
 * Cursor-based pagination is a way of loading data in chunks by using a cursor
 * from the last item on the current page to know where to start the next set,
 * making sure nothing is missed or repeated. Like a linked list, but for chunks
 * of data. It doesn't let you jump to a specific page or know how many total pages
 * there are, but it's more efficient for large or real-time data sets.
 *
 * @see https://mantle.ngrok.com/components/pagination#cursorpaginationroot
 *
 * @example
 * ```tsx
 * <CursorPagination defaultPageSize={10}>
 *   <CursorPagination.Buttons
 *     hasNextPage={hasNext}
 *     hasPreviousPage={hasPrevious}
 *     onNextPage={handleNext}
 *     onPreviousPage={handlePrevious}
 *   />
 *   <CursorPagination.PageSizeSelect />
 * </CursorPagination>
 * ```
 */
const Root = forwardRef<HTMLDivElement, CursorPaginationProps>(
	({ className, children, defaultPageSize, ...props }, ref) => {
		const [pageSize, setPageSize] = useState<number>(defaultPageSize);

		return (
			<CursorPaginationContext.Provider value={{ defaultPageSize, pageSize, setPageSize }}>
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
	},
);
Root.displayName = "CursorPagination";

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
 * @see https://mantle.ngrok.com/components/pagination#cursorpaginationbuttons
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
const Buttons = forwardRef<ComponentRef<typeof ButtonGroup>, CursorButtonsProps>(
	({ hasNextPage, hasPreviousPage, onNextPage, onPreviousPage, ...props }, ref) => {
		// TODO(cody): this _feels_ like a good spot for left and right arrow keys to navigate between pages when focused on the buttons

		return (
			<ButtonGroup data-slot="cursor-pagination-buttons" appearance="panel" ref={ref} {...props}>
				<IconButton
					data-slot="cursor-pagination-previous"
					appearance="ghost"
					disabled={!hasPreviousPage}
					icon={<CaretLeftIcon />}
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
					label="Next page"
					onClick={onNextPage}
					size="sm"
					type="button"
				/>
			</ButtonGroup>
		);
	},
);
Buttons.displayName = "CursorButtons";

const defaultPageSizes = [5, 10, 20, 50, 100] as const;

type CursorPageSizeSelectProps = Omit<ComponentProps<typeof Select.Trigger>, "children"> & {
	/**
	 * A list of page sizes to choose from. The default page size must be included in this list.
	 */
	pageSizes?: typeof defaultPageSizes | readonly number[];
	/**
	 * A callback that is called when the page size is changed.
	 */
	onChangePageSize?: (value: number) => void;
};

/**
 * A select input for changing the number of items per page when using cursor-based pagination.
 *
 * @see https://mantle.ngrok.com/components/pagination#cursorpaginationpagesizeselect
 *
 * @example
 * ```tsx
 * <CursorPagination.PageSizeSelect
 *   pageSizes={[10, 20, 50, 100]}
 *   onChangePageSize={(size) => console.log('Page size changed to:', size)}
 * />
 * ```
 */
const PageSizeSelect = forwardRef<ComponentRef<typeof Select.Trigger>, CursorPageSizeSelectProps>(
	({ className, pageSizes = defaultPageSizes, onChangePageSize, ...rest }, ref) => {
		const ctx = useContext(CursorPaginationContext);

		invariant(ctx, "CursorPageSizeSelect must be used as a child of a CursorPagination component");

		invariant(
			pageSizes.includes(ctx.defaultPageSize),
			"CursorPagination.defaultPageSize must be included in CursorPageSizeSelect.pageSizes",
		);

		invariant(
			pageSizes.includes(ctx.pageSize),
			"CursorPagination.pageSize must be included in CursorPageSizeSelect.pageSizes",
		);

		return (
			<Select.Root
				defaultValue={`${ctx.pageSize}`}
				onValueChange={(value) => {
					let newPageSize = Number.parseInt(value, 10);
					if (Number.isNaN(newPageSize)) {
						newPageSize = ctx.defaultPageSize;
					}
					ctx.setPageSize(newPageSize);
					onChangePageSize?.(newPageSize);
				}}
			>
				<Select.Trigger
					ref={ref}
					data-slot="cursor-pagination-page-size-select"
					className={cx("w-auto min-w-36", className)}
					value={ctx.pageSize}
					{...rest}
				>
					<Select.Value />
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
	},
);
PageSizeSelect.displayName = "CursorPageSizeSelect";

type CursorPageSizeValueProps = Omit<ComponentProps<"span">, "children"> & WithAsChild;

/**
 * Displays the current page size when using cursor-based pagination as a read-only value.
 *
 * @see https://mantle.ngrok.com/components/pagination#cursorpaginationpagesizevalue
 *
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <span>Items per page:</span>
 *   <CursorPagination.PageSizeValue />
 * </div>
 * ```
 */
function PageSizeValue({ asChild = false, className, ...props }: CursorPageSizeValueProps) {
	const ctx = useContext(CursorPaginationContext);

	invariant(ctx, "CursorPageSizeValue must be used as a child of a CursorPagination component");

	const Component = asChild ? Slot : "span";

	return (
		<Component
			data-slot="cursor-pagination-page-size-value"
			className={cx("text-muted text-sm font-normal", className)}
			{...props}
		>
			{ctx.pageSize} per page
		</Component>
	);
}
PageSizeValue.displayName = "CursorPageSizeValue";

/**
 * A pagination component for use with cursor-based pagination.
 *
 * Cursor-based pagination is a way of loading data in chunks by using a cursor
 * from the last item on the current page to know where to start the next set,
 * making sure nothing is missed or repeated. Like a linked list, but for chunks
 * of data. It doesn't let you jump to a specific page or know how many total pages
 * there are, but it's more efficient for large or real-time data sets.
 *
 * @see https://mantle.ngrok.com/components/pagination
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
 * <CursorPagination defaultPageSize={10}>
 *   <CursorPagination.Buttons
 *     hasNextPage={hasNext}
 *     hasPreviousPage={hasPrevious}
 *     onNextPage={handleNext}
 *     onPreviousPage={handlePrevious}
 *   />
 *   <CursorPagination.PageSizeSelect />
 * </CursorPagination>
 * ```
 */
const CursorPagination = {
	/**
	 * The root container of the cursor pagination component.
	 *
	 * @see https://mantle.ngrok.com/components/pagination#cursorpaginationroot
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
	Root,
	/**
	 * A pair of buttons for navigating between pages of data when using cursor-based pagination.
	 *
	 * @see https://mantle.ngrok.com/components/pagination#cursorpaginationbuttons
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
	 * @see https://mantle.ngrok.com/components/pagination#cursorpaginationpagesizeselect
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
	 * @see https://mantle.ngrok.com/components/pagination#cursorpaginationpagesizevalue
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
