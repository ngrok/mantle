/**
 * The parts of the `Sheet` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Actions,
	Body,
	Close,
	CloseIconButton,
	Content,
	Description,
	Footer,
	Header,
	Title,
	TitleGroup,
	Trigger,
} from "./sheet.js";
