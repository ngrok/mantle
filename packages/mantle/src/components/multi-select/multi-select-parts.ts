/**
 * The parts of the `MultiSelect` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Trigger,
	TagValues,
	Input,
	Tag,
	Content,
	ContentFooter,
	Item,
	Group,
	GroupLabel,
	GroupDescription,
	MultiSelectSeparatorComponent as Separator,
	Empty,
} from "./multi-select.js";
