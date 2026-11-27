import { Button } from "@ngrok/mantle/button";
import {
	CursorPagination,
	getOffsetPaginatedSlice,
	PaginationRange,
	useOffsetPagination,
} from "@ngrok/mantle/pagination";
import { useState } from "react";

import { PaginatedPaymentsDemo } from "~/features/data-table-demo";
import { PreviewCanvas } from "~/components/preview-canvas";

export function ServerCursorPaginationExample() {
	const totalPages = 3;
	const [pageIndex, setPageIndex] = useState(0);

	return (
		<CursorPagination.Root className="flex justify-end" defaultPageSize={10}>
			<CursorPagination.PageSizeValue />
			<CursorPagination.Buttons
				hasPreviousPage={pageIndex > 0}
				hasNextPage={pageIndex < totalPages - 1}
				onPreviousPage={() => setPageIndex((index) => Math.max(0, index - 1))}
				onNextPage={() => setPageIndex((index) => Math.min(totalPages - 1, index + 1))}
			/>
		</CursorPagination.Root>
	);
}

export function ControlledPageSizeDemo() {
	const [pageSize, setPageSize] = useState(10);

	return (
		<div className="flex flex-col gap-4">
			<CursorPagination.Root pageSize={pageSize} onChangePageSize={setPageSize}>
				<CursorPagination.PageSizeSelect />
				<CursorPagination.Buttons hasNextPage hasPreviousPage={false} />
			</CursorPagination.Root>
			<div className="flex items-center gap-4">
				<p className="text-muted text-sm">Page size in state: {pageSize}</p>
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					onClick={() => setPageSize(100)}
				>
					Set 100 from outside
				</Button>
			</div>
		</div>
	);
}

export const offsetSliceItems = [
	"Alpha",
	"Bravo",
	"Charlie",
	"Delta",
	"Echo",
	"Foxtrot",
	"Golf",
	"Hotel",
	"India",
];

export function OffsetPaginationExample() {
	const pagination = useOffsetPagination({ listSize: 150, pageSize: 10 });

	return (
		<div className="flex items-center gap-4">
			<p className="text-muted text-sm">
				Page {pagination.currentPage} of {pagination.totalPages}
			</p>
			<div className="flex gap-2">
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					disabled={!pagination.hasPreviousPage}
					onClick={pagination.previousPage}
				>
					Previous
				</Button>
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					disabled={!pagination.hasNextPage}
					onClick={pagination.nextPage}
				>
					Next
				</Button>
			</div>
		</div>
	);
}

export function ControlledOffsetPaginationExample() {
	const [page, setPage] = useState(5);
	const [listSize, setListSize] = useState(150);
	const pagination = useOffsetPagination({
		listSize,
		pageSize: 10,
		page,
		onPageChange: setPage,
		resetPageOnListSizeChange: false,
	});

	return (
		<div className="flex flex-col gap-4">
			<p className="text-muted text-sm">
				Page {pagination.currentPage} of {pagination.totalPages}, {listSize} items
			</p>
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					disabled={!pagination.hasPreviousPage}
					onClick={pagination.previousPage}
				>
					Previous
				</Button>
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					disabled={!pagination.hasNextPage}
					onClick={pagination.nextPage}
				>
					Next
				</Button>
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					onClick={() => setListSize((size) => (size === 150 ? 25 : 150))}
				>
					Refetch {listSize === 150 ? 25 : 150} items
				</Button>
			</div>
		</div>
	);
}

export function OffsetPaginatedSliceExample() {
	const pagination = useOffsetPagination({ listSize: offsetSliceItems.length, pageSize: 3 });
	const currentPageItems = getOffsetPaginatedSlice(offsetSliceItems, pagination);

	return (
		<div className="flex flex-col gap-4">
			<ul className="flex flex-col gap-1">
				{currentPageItems.map((item) => (
					<li key={item} className="text-sm">
						{item}
					</li>
				))}
			</ul>
			<div className="flex items-center gap-4">
				<p className="text-muted text-sm">
					Page {pagination.currentPage} of {pagination.totalPages}
				</p>
				<div className="flex gap-2">
					<Button
						type="button"
						appearance="outlined"
						intent="neutral"
						disabled={!pagination.hasPreviousPage}
						onClick={pagination.previousPage}
					>
						Previous
					</Button>
					<Button
						type="button"
						appearance="outlined"
						intent="neutral"
						disabled={!pagination.hasNextPage}
						onClick={pagination.nextPage}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}

/** The first example on the Pagination docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<CursorPagination.Root defaultPageSize={100}>
				<CursorPagination.PageSizeSelect />
				<CursorPagination.Buttons hasNextPage hasPreviousPage />
			</CursorPagination.Root>
		</PreviewCanvas>
	);
}

/** The "Read-only page size" example on the Pagination docs page. */
export function ReadOnlyPageSizeExample() {
	return (
		<PreviewCanvas>
			<CursorPagination.Root defaultPageSize={100}>
				<CursorPagination.PageSizeValue />
				<CursorPagination.Buttons hasNextPage hasPreviousPage />
			</CursorPagination.Root>
		</PreviewCanvas>
	);
}

/** The "Buttons only" example on the Pagination docs page. */
export function ButtonsOnlyExample() {
	return (
		<PreviewCanvas>
			<CursorPagination.Root defaultPageSize={100}>
				<CursorPagination.Buttons hasNextPage hasPreviousPage={false} />
			</CursorPagination.Root>
		</PreviewCanvas>
	);
}

/** The "Controlled page size" example on the Pagination docs page. */
export function ControlledPageSizeExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<ControlledPageSizeDemo />
		</PreviewCanvas>
	);
}

/** The "Client-paginated" example on the Pagination docs page. */
export function ClientPaginatedExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<PaginatedPaymentsDemo />
		</PreviewCanvas>
	);
}

/** The "Loading" example on the Pagination docs page. */
export function LoadingExample() {
	const [isLoading, setIsLoading] = useState(true);

	return (
		<PreviewCanvas>
			<div className="flex items-center gap-4">
				<Button
					type="button"
					appearance="outlined"
					intent="neutral"
					onClick={() => setIsLoading((loading) => !loading)}
				>
					{isLoading ? "Finish loading" : "Load again"}
				</Button>
				<PaginationRange
					isLoading={isLoading}
					offset={0}
					pageSize={10}
					total={23}
					noun={{ singular: "payment", plural: "payments" }}
				/>
			</div>
		</PreviewCanvas>
	);
}

/** The "Server cursor data" example on the Pagination docs page. */
export function ServerCursorDataExample() {
	return (
		<PreviewCanvas>
			<ServerCursorPaginationExample />
		</PreviewCanvas>
	);
}

/** The "useOffsetPagination" example on the Pagination docs page. */
export function UseoffsetpaginationExample() {
	return (
		<PreviewCanvas>
			<OffsetPaginationExample />
		</PreviewCanvas>
	);
}

/** The "Own the page" example on the Pagination docs page. */
export function OwnThePageExample() {
	return (
		<PreviewCanvas>
			<ControlledOffsetPaginationExample />
		</PreviewCanvas>
	);
}

/** The "getOffsetPaginatedSlice" example on the Pagination docs page. */
export function GetoffsetpaginatedsliceExample() {
	return (
		<PreviewCanvas>
			<OffsetPaginatedSliceExample />
		</PreviewCanvas>
	);
}
