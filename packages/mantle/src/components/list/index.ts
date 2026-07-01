/**
 * Re-exports for the List component — the low-level scroll + row primitive that
 * also backs `ScrollableList` and `SelectableList` (mirroring how
 * `dialog/primitive` backs the dialog family).
 *
 * The public `List` compound is assembled in `./list.js`. The plain `Root` /
 * `Row` live in `./primitive.js` and the windowed `VirtualRoot` in `./virtual.js`
 * — the higher-level components import those internal modules directly, so
 * `@tanstack/react-virtual` is only pulled in where virtualization is used.
 *
 * @see https://mantle.ngrok.com/components/list
 */

export {
	//,
	List,
} from "./list.js";

export type {
	//,
	ListRootProps,
	ListRowProps,
	ListSemantics,
} from "./primitive.js";

export type {
	//,
	VirtualRootProps,
} from "./virtual.js";
