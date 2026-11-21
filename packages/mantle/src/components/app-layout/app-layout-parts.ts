/**
 * The parts of the `AppLayout` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Notice,
	Workspace,
	Content,
	Header,
	HeaderStart,
	HeaderContent,
	HeaderActions,
	Body,
	SidePanelRoot,
	SidePanel,
	SidePanelTrigger,
	SidePanelHeader,
	SidePanelBody,
	SidePanelFooter,
} from "./app-layout.js";
