import {
	EmptyPaymentsDemo,
	EndpointsDemo,
	ExpandableRowsDemo,
	FilteredEmptyStateDemo,
	FitColumnDemo,
	PaginatedPaymentsDemo,
	PaymentsDemo,
	QuickStartDemo,
	SelectablePaymentsDemo,
	SubRowsDemo,
} from "~/features/data-table-demo";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Data Table docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<QuickStartDemo />
		</PreviewCanvas>
	);
}

/** The "Sorting, row links, and actions" example on the Data Table docs page. */
export function SortingRowLinksAndActionsExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<PaymentsDemo />
		</PreviewCanvas>
	);
}

/** The "No results for a filter" example on the Data Table docs page. */
export function NoResultsForAFilterExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<FilteredEmptyStateDemo />
		</PreviewCanvas>
	);
}

/** The "No data" example on the Data Table docs page. */
export function NoDataExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<EmptyPaymentsDemo />
		</PreviewCanvas>
	);
}

/** The "Action column with a dropdown menu" example on the Data Table docs page. */
export function ActionColumnWithADropdownMenuExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<EndpointsDemo />
		</PreviewCanvas>
	);
}

/** The "Sizing a column to its content" example on the Data Table docs page. */
export function SizingAColumnToItsContentExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<FitColumnDemo />
		</PreviewCanvas>
	);
}

/** The "Pagination controls" example on the Data Table docs page. */
export function PaginationControlsExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<PaginatedPaymentsDemo />
		</PreviewCanvas>
	);
}

/** The "Row selection with checkboxes" example on the Data Table docs page. */
export function RowSelectionWithCheckboxesExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<SelectablePaymentsDemo />
		</PreviewCanvas>
	);
}

/** The "Expandable rows" example on the Data Table docs page. */
export function ExpandableRowsExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<ExpandableRowsDemo />
		</PreviewCanvas>
	);
}

/** The "Sub-rows" example on the Data Table docs page. */
export function SubRowsExample() {
	return (
		<PreviewCanvas className="min-h-160">
			<SubRowsDemo />
		</PreviewCanvas>
	);
}
