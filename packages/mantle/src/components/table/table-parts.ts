/**
 * The parts of the `Table` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Body,
	Caption,
	Cell,
	Element,
	Foot,
	Head,
	Header,
	Root,
	Row,
} from "./table.js";
