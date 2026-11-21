/**
 * The parts of the `Sandbar` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Message,
	Actions,
	SaveButton,
	DiscardButton,
} from "./sandbar.js";
