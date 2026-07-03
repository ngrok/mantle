/**
 * Re-exports for the List component — the low-level scroll + row primitive that
 * also backs `ScrollableList` and `SelectableList` (mirroring how
 * `dialog/primitive` backs the dialog family).
 *
 * The public `List` compound is assembled in `./list.js`. The plain `Root` /
 * `Row` live in `./primitive.js` and the windowed `VirtualRoot` in `./virtual.js`
 * — the split keeps the plain shell free of virtualizer code, though every list
 * entrypoint re-exports `VirtualRoot`, so `@tanstack/react-virtual` (small, and
 * inert until a `VirtualRoot` renders) ships with each of them.
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
