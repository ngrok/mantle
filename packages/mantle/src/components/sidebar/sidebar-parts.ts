/**
 * The parts of the `Sidebar` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Nav,
	Trigger,
	Header,
	Body,
	Footer,
	Group,
	GroupLabel,
	List,
	Item,
	ItemButton,
	SearchTrigger,
	SwitcherTrigger,
	SidebarTooltip as Tooltip,
	SidebarSeparator as Separator,
} from "./sidebar.js";
