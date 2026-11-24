/**
 * The parts of the `Attachment` namespace. `index.ts` imports them as one
 * module namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	List,
	Root,
	Preview,
	Name,
	Size,
	Remove,
} from "./attachment.js";
