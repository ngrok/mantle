/**
 * The parts of the `Alert` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Content,
	Description,
	Title,
} from "./alert.js";
export {
	//,
	Icon,
} from "./alert-context.js";
export {
	//,
	DismissIconButton,
	ExpandButton,
} from "./alert-controls.js";
