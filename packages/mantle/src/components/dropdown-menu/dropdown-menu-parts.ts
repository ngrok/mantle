/**
 * The parts of the `DropdownMenu` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	CheckboxItem,
	Content,
	Group,
	Item,
	Label,
	RadioGroup,
	RadioItem,
	DropdownSeparator as Separator,
	Shortcut,
	Sub,
	SubContent,
	SubTrigger,
	Trigger,
} from "./dropdown-menu.js";
