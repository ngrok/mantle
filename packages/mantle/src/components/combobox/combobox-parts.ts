/**
 * The parts of the `Combobox` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Content,
	Group,
	GroupLabel,
	Input,
	Item,
	ItemValue,
	ComboboxSeparatorComponent as Separator,
} from "./combobox.js";
