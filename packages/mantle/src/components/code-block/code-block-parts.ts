/**
 * The parts of the `CodeBlock` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Code,
	CopyButton,
	ExpanderButton,
	TabContent,
	TabList,
	TabTrigger,
} from "./code-block.js";
export {
	//,
	Body,
	CodeBlockIconComponent as Icon,
	Header,
	Title,
} from "./code-block-layout.js";
