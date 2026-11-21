/**
 * The parts of the `Query` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Input,
	Content,
	List,
	Item,
	Empty,
	Footer,
	Legend,
	KeyboardHints,
} from "./query.js";
