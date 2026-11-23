/**
 * The parts of the `Dialog` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Close,
	CloseIconButton,
	Content,
	Description,
	// oxlint-disable-next-line typescript/no-deprecated -- Why: markup written for Radix keeps working until a later minor removes them.
	Overlay,
	// oxlint-disable-next-line typescript/no-deprecated -- Why: as above.
	Portal,
	Title,
	Trigger,
} from "./dialog.js";

export {
	//,
	Body,
	Footer,
	Header,
} from "./presentation.js";
