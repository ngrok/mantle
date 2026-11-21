/**
 * The parts of the `List` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	VirtualRoot,
	Item,
	ItemTitle,
	ItemDescription,
} from "./list.js";
