/**
 * The parts of the native `Sheet` namespace. `index.ts` imports them as one
 * module namespace, so a bundler keeps only the parts a consumer reads.
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
} from "./sheet-native.js";

export {
	//,
	Actions,
	Body,
	Footer,
	Header,
	TitleGroup,
} from "../presentation.js";
