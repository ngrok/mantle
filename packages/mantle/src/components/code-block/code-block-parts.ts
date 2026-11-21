/**
 * The parts of the `CodeBlock` namespace. `index.ts` imports them as one module
 * namespace, so a bundler keeps only the parts a consumer reads.
 */

export {
	//,
	Root,
	Body,
	Code,
	CopyButton,
	ExpanderButton,
	Header,
	CodeBlockIconComponent as Icon,
	TabContent,
	TabList,
	TabTrigger,
	Title,
} from "./code-block.js";
