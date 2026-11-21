/**
 * The parts of the `Sheet` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Close,
	CloseIconButton,
	Content,
	Description,
	Title,
	Trigger,
} from "./sheet.js";
export {
	//,
	Actions,
	Body,
	Footer,
	Header,
	TitleGroup,
} from "./sheet-layout.js";
