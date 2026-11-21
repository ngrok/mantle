/**
 * The parts of the `Toast` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Action,
	Icon,
	Message,
} from "./toast.js";
