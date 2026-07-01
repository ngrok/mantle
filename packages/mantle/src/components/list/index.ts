// The internal `list` primitive: the shared scroll + row chrome and ARIA
// semantics behind `ScrollableList` and `SelectableList` (mirroring how
// `dialog/primitive` backs the dialog family). Composition-based — compose
// `Row` children under a `Root`; state lives on the rows. Not published as a
// `@ngrok/mantle/*` subpath; consumers reach it through those components.
//
// The plain `Root` / `Row` are re-exported here; the virtualized `VirtualRoot`
// lives in `./virtual.js` and is imported directly, so `@tanstack/react-virtual`
// is only pulled in when virtualization is actually used.
export {
	//,
	listCollectionClassName,
	listRowClassName,
	listViewportClassName,
	Root,
	Row,
} from "./primitive.js";

export type {
	//,
	ListRootProps,
	ListRowProps,
	ListSemantics,
} from "./primitive.js";
