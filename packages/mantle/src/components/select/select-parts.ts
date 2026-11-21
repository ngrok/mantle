/**
 * The parts of the `Select` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Content,
	Group,
	Item,
	Label,
	SelectSeparatorComponent as Separator,
	Trigger,
	Value,
} from "./select.js";
