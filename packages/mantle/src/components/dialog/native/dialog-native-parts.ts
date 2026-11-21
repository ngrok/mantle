/**
 * The parts of the native `Dialog` namespace. `index.ts` imports them as one
 * module namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Close,
	CloseIconButton,
	Content,
	Description,
	Overlay,
	Portal,
	Title,
	Trigger,
} from "./dialog-native.js";

export {
	//,
	Body,
	Footer,
	Header,
} from "../presentation.js";
