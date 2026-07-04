/**
 * Re-exports for the List component — a scrollable, optionally-virtualized
 * list of clickable items (account switchers, SSO provider pickers).
 *
 * The list primitive backing it (and `SelectableList`) lives in
 * `./primitive.js` / `./virtual.js` and is deliberately **not** exported — it
 * is internal shared implementation, mirroring how `dialog/primitive` backs
 * the dialog family.
 *
 * @see https://mantle.ngrok.com/components/list
 */

export {
	//,
	List,
} from "./list.js";

export type {
	//,
	ListItemProps,
	ListViewportProps,
	ListVirtualViewportProps,
} from "./list.js";
