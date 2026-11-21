/**
 * The parts of the `Choice` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Indicator,
	Content,
	ChoiceLabel as Label,
	Title,
	Description,
} from "./choice.js";
