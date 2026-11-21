/**
 * The parts of the `DataTable` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	ActionCell,
	ActionHeader,
	Cell,
	Body,
	EmptyRow,
	Head,
	Header,
	HeaderSortButton,
	Row,
	ExpandHeader,
	ControlCell,
	RowExpandButton,
	ExpandedRow,
} from "./data-table.js";
