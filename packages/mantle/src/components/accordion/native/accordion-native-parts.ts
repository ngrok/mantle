/**
 * The parts of the native `Accordion` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Item,
	Trigger,
	TriggerIcon,
	Content,
	Body,
} from "./accordion-native.js";
