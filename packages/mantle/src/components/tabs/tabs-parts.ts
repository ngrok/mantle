/**
 * The parts of the `Tabs` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Content,
	List,
	TabsSeparator as Separator,
	Trigger,
	Badge,
} from "./tabs.js";
