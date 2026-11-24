/**
 * The parts of the `Message` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Content,
	Actions,
	Pending,
} from "./message.js";
