/**
 * The parts of the `AlertDialog` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Action,
	Body,
	Cancel,
	Close,
	Content,
	Description,
	Footer,
	Header,
	Icon,
	Title,
	Trigger,
} from "./alert-dialog.js";
