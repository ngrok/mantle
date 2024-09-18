import { forwardRef } from "react";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cx } from "../../cx";

const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(({ className, ...props }, ref) => (
	// <div className="">
	<table ref={ref} className={cx("relative w-full caption-bottom overflow-auto text-sm", className)} {...props} />
	// </div>
));
Table.displayName = "Table";

const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
	({ className, ...props }, ref) => (
		<thead ref={ref} className={cx("bg-card [&_tr]:border-b [&_tr]:border-card-muted", className)} {...props} />
	),
);
TableHeader.displayName = "TableHeader";

const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
	({ className, ...props }, ref) => (
		<tbody ref={ref} className={cx("text-strong [&_tr:last-child]:border-0", className)} {...props} />
	),
);
TableBody.displayName = "TableBody";

const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
	({ className, ...props }, ref) => (
		<tfoot
			ref={ref}
			className={cx("border-t border-card-muted bg-card-hover/60 font-medium [&>tr]:last:border-b-0", className)}
			{...props}
		/>
	),
);
TableFooter.displayName = "TableFooter";

const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
	({ className, ...props }, ref) => (
		<tr
			ref={ref}
			className={cx("border-b border-card-muted hover:bg-card-hover data-state-selected:bg-neutral-200", className)}
			{...props}
		/>
	),
);
TableRow.displayName = "TableRow";

const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
	({ className, ...props }, ref) => (
		<th
			ref={ref}
			className={cx(
				"h-12 px-4 text-left align-middle font-medium text-strong [&:has([role=checkbox])]:pr-0",
				className,
			)}
			{...props}
		/>
	),
);
TableHead.displayName = "TableHead";

const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
	({ className, ...props }, ref) => (
		<td ref={ref} className={cx("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
	),
);
TableCell.displayName = "TableCell";

const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
	({ className, ...props }, ref) => (
		<caption ref={ref} className={cx("border-t border-card-muted py-4 text-sm text-muted", className)} {...props} />
	),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
